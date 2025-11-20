import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("VeritasGovernor", function () {
  let token;
  let governor;
  let timelock;
  let treasury;
  let owner;
  let addr1;
  let addr2;

  const VOTING_DELAY = 1n;
  const VOTING_PERIOD = 20160n; // ~3 days
  const PROPOSAL_THRESHOLD = ethers.parseEther("10000"); // 10,000 tokens
  const QUORUM_FRACTION = 4n; // 4%
  const TIMELOCK_DELAY = 3600n; // 1 hour

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VeritasToken
    const VeritasToken = await ethers.getContractFactory("VeritasToken");
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens
    token = await VeritasToken.deploy(initialSupply, owner.address);
    await token.waitForDeployment();

    // Deploy TimelockController
    const TimelockController = await ethers.getContractFactory("TimelockController");
    timelock = await TimelockController.deploy(
      TIMELOCK_DELAY,
      [],
      [],
      owner.address
    );
    await timelock.waitForDeployment();

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await timelock.getAddress());
    await treasury.waitForDeployment();

    // Deploy VeritasGovernor
    const VeritasGovernor = await ethers.getContractFactory("VeritasGovernor");
    governor = await VeritasGovernor.deploy(
      await token.getAddress(),
      await timelock.getAddress(),
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THRESHOLD,
      QUORUM_FRACTION
    );
    await governor.waitForDeployment();

    // Setup Timelock roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governor.getAddress());
    await timelock.grantRole(CANCELLER_ROLE, await governor.getAddress());

    // Renounce admin role (optional - may not be needed for tests)
    try {
      const ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
      await timelock.renounceRole(ADMIN_ROLE, owner.address);
    } catch (error) {
      // Admin role renouncing is optional for tests
      console.log("Note: Could not renounce admin role (this is OK for tests)");
    }
  });

  describe("Deployment", function () {
    it("Should set correct voting parameters", async function () {
      expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
      expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
      expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });

    it("Should calculate quorum correctly", async function () {
      // Use a past block number (current block - 1) to avoid future lookup error
      const currentBlock = await ethers.provider.getBlockNumber();
      const pastBlock = currentBlock > 0 ? currentBlock - 1 : currentBlock;
      const quorum = await governor.quorum(pastBlock);
      const totalSupply = await token.totalSupply();
      const expectedQuorum = (totalSupply * QUORUM_FRACTION) / 100n;
      expect(quorum).to.equal(expectedQuorum);
    });
  });

  describe("Proposals", function () {
    beforeEach(async function () {
      // Give tokens to addr1 for proposal creation
      const proposalAmount = PROPOSAL_THRESHOLD + ethers.parseEther("1000");
      await token.transfer(addr1.address, proposalAmount);
      await token.connect(addr1).delegate(addr1.address);
    });

    it("Should create a proposal", async function () {
      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      const tx = await governor.connect(addr1).propose(
        targets,
        values,
        calldatas,
        description
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("Should not allow proposal creation below threshold", async function () {
      // Give addr2 less than threshold
      const smallAmount = PROPOSAL_THRESHOLD - ethers.parseEther("1");
      await token.transfer(addr2.address, smallAmount);
      await token.connect(addr2).delegate(addr2.address);

      const targets = [await treasury.getAddress()];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await expect(
        governor.connect(addr2).propose(targets, values, calldatas, description)
      ).to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
    });
  });
});

