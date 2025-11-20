import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Treasury", function () {
  let treasury;
  let owner;
  let addr1;
  let addr2;
  let mockToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Treasury with owner as Timelock
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(owner.address);
    await treasury.waitForDeployment();

    // Deploy mock ERC20 token for testing (using VeritasToken as mock)
    const VeritasToken = await ethers.getContractFactory("VeritasToken");
    mockToken = await VeritasToken.deploy(ethers.parseEther("1000000"), addr1.address);
    await mockToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should not allow zero address as owner", async function () {
      const Treasury = await ethers.getContractFactory("Treasury");
      // Ownable v5 throws custom error for zero address, but our require should catch it first
      // However, the require is after Ownable constructor, so Ownable error might be thrown first
      // Let's check for either error
      const deployTx = Treasury.deploy(ethers.ZeroAddress);
      await expect(deployTx).to.be.reverted;
    });
  });

  describe("Receiving ETH", function () {
    it("Should receive ETH", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        addr1.sendTransaction({ to: await treasury.getAddress(), value: amount })
      ).to.emit(treasury, "EthReceived");
    });

    it("Should track ETH balance correctly", async function () {
      const amount = ethers.parseEther("5.0");
      await addr1.sendTransaction({ to: await treasury.getAddress(), value: amount });
      expect(await treasury.getEthBalance()).to.equal(amount);
    });
  });

  describe("Withdrawing ETH", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("10.0");
      await addr1.sendTransaction({ to: await treasury.getAddress(), value: amount });
    });

    it("Should allow owner to withdraw ETH", async function () {
      const withdrawAmount = ethers.parseEther("5.0");
      await expect(
        treasury.withdrawEth(addr2.address, withdrawAmount)
      ).to.emit(treasury, "EthWithdrawn");
    });

    it("Should not allow non-owner to withdraw ETH", async function () {
      const withdrawAmount = ethers.parseEther("5.0");
      await expect(
        treasury.connect(addr1).withdrawEth(addr2.address, withdrawAmount)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });

    it("Should not allow withdrawal to zero address", async function () {
      const withdrawAmount = ethers.parseEther("5.0");
      await expect(
        treasury.withdrawEth(ethers.ZeroAddress, withdrawAmount)
      ).to.be.revertedWith("Treasury: cannot withdraw to zero address");
    });

    it("Should not allow withdrawal of zero amount", async function () {
      await expect(
        treasury.withdrawEth(addr2.address, 0)
      ).to.be.revertedWith("Treasury: amount must be greater than zero");
    });

    it("Should not allow withdrawal exceeding balance", async function () {
      const excessAmount = ethers.parseEther("100.0");
      await expect(
        treasury.withdrawEth(addr2.address, excessAmount)
      ).to.be.revertedWith("Treasury: insufficient balance");
    });
  });

  describe("Withdrawing ERC20 Tokens", function () {
    beforeEach(async function () {
      // Transfer tokens to treasury
      const amount = ethers.parseEther("1000");
      await mockToken.connect(addr1).transfer(await treasury.getAddress(), amount);
    });

    it("Should allow owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("500");
      await expect(
        treasury.withdrawToken(await mockToken.getAddress(), addr2.address, withdrawAmount)
      ).to.emit(treasury, "TokenWithdrawn");
    });

    it("Should not allow non-owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("500");
      await expect(
        treasury.connect(addr1).withdrawToken(await mockToken.getAddress(), addr2.address, withdrawAmount)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });
});

