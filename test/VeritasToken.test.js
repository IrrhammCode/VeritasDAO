import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("VeritasToken", function () {
  let veritasToken;
  let owner;
  let addr1;
  let addr2;
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const VeritasToken = await ethers.getContractFactory("VeritasToken");
    veritasToken = await VeritasToken.deploy(initialSupply, owner.address);
    await veritasToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await veritasToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await veritasToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply);
    });

    it("Should have correct name and symbol", async function () {
      expect(await veritasToken.name()).to.equal("Veritas Token");
      expect(await veritasToken.symbol()).to.equal("VERITAS");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await veritasToken.mint(addr1.address, mintAmount);
      expect(await veritasToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        veritasToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(veritasToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    it("Should allow anyone to burn their own tokens", async function () {
      const transferAmount = ethers.parseEther("1000");
      await veritasToken.transfer(addr1.address, transferAmount);
      
      const burnAmount = ethers.parseEther("500");
      await veritasToken.connect(addr1).burn(burnAmount);
      expect(await veritasToken.balanceOf(addr1.address)).to.equal(
        transferAmount - burnAmount
      );
    });
  });

  describe("Voting Power", function () {
    it("Should track voting power correctly", async function () {
      const transferAmount = ethers.parseEther("10000");
      await veritasToken.transfer(addr1.address, transferAmount);
      
      // Delegate to self
      await veritasToken.connect(addr1).delegate(addr1.address);
      
      // Check voting power
      const votingPower = await veritasToken.getVotes(addr1.address);
      expect(votingPower).to.equal(transferAmount);
    });

    it("Should allow delegation", async function () {
      const transferAmount = ethers.parseEther("10000");
      await veritasToken.transfer(addr1.address, transferAmount);
      
      // Delegate to addr2
      await veritasToken.connect(addr1).delegate(addr2.address);
      
      const votingPower = await veritasToken.getVotes(addr2.address);
      expect(votingPower).to.equal(transferAmount);
    });
  });
});

