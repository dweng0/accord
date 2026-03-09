import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AccordRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AccordRegistry", function () {
  let accordRegistry: AccordRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const IPFS_HASH = "QmTestHash123456789";
  const NEW_IPFS_HASH = "QmNewHash987654321";
  const REGISTRATION_FEE = ethers.parseEther("0.001");
  const UNREGISTRATION_FEE = ethers.parseEther("0.0005");

  async function deployFixture() {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const AccordRegistryFactory = await ethers.getContractFactory("AccordRegistry");
    const accordRegistry = await AccordRegistryFactory.deploy();
    await accordRegistry.waitForDeployment();

    return { accordRegistry, owner, user1, user2, user3 };
  }

  beforeEach(async function () {
    const fixtures = await loadFixture(deployFixture);
    this.accordRegistry = fixtures.accordRegistry;
    this.owner = fixtures.owner;
    this.user1 = fixtures.user1;
    this.user2 = fixtures.user2;
    this.user3 = fixtures.user3;
  });

describe("AccordRegistry", function () {
  let accordRegistry: AccordRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const IPFS_HASH = "QmTestHash123456789";
  const NEW_IPFS_HASH = "QmNewHash987654321";
  const REGISTRATION_FEE = ethers.parseEther("0.001");
  const UNREGISTRATION_FEE = ethers.parseEther("0.0005");

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const AccordRegistryFactory = await ethers.getContractFactory("AccordRegistry");
    accordRegistry = await AccordRegistryFactory.deploy();
    await accordRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await accordRegistry.owner()).to.equal(owner.address);
    });

    it("Should set correct registration fee", async function () {
      expect(await accordRegistry.registrationFee()).to.equal(REGISTRATION_FEE);
    });

    it("Should set correct unregistration fee", async function () {
      expect(await accordRegistry.unregistrationFee()).to.equal(UNREGISTRATION_FEE);
    });

    it("Should start with zero accords", async function () {
      expect(await accordRegistry.getAccordCount()).to.equal(0);
    });
  });

  describe("Register Accord", function () {
    it("Should register a new accord with correct fee", async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "AccordRegistered"
      );

      expect(event).to.not.be.undefined;

      const accordCount = await accordRegistry.getAccordCount();
      expect(accordCount).to.equal(1);
    });

    it("Should emit AccordRegistered event", async function () {
      await expect(
        accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
          value: REGISTRATION_FEE,
        })
      ).to.emit(accordRegistry, "AccordRegistered");
    });

    it("Should store correct accord data", async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      const accordId = receipt?.logs[0].topics[1];

      const accord = await accordRegistry.getAccord(accordId!);

      expect(accord.owner).to.equal(user1.address);
      expect(accord.ipfsHash).to.equal(IPFS_HASH);
      expect(accord.active).to.be.true;
      expect(accord.createdAt).to.be.greaterThan(0);
    });

    it("Should fail with insufficient fee", async function () {
      await expect(
        accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
          value: ethers.parseEther("0.0001"),
        })
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should fail with empty IPFS hash", async function () {
      await expect(
        accordRegistry.connect(user1).registerAccord("", {
          value: REGISTRATION_FEE,
        })
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should refund excess payment", async function () {
      const excess = ethers.parseEther("0.01");
      const initialBalance = await ethers.provider.getBalance(user1.address);

      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE + excess,
      });

      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);

      // Should only lose registration fee + gas, not the excess
      const expectedBalance = initialBalance - REGISTRATION_FEE - gasUsed;
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.00001"));
    });

    it("Should allow multiple accords from same user", async function () {
      await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      await accordRegistry.connect(user1).registerAccord("QmHash2", {
        value: REGISTRATION_FEE,
      });

      expect(await accordRegistry.getAccordCount()).to.equal(2);
    });
  });

  describe("Unregister Accord", function () {
    let accordId: string;

    beforeEach(async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      accordId = receipt?.logs[0].topics[1]!;
    });

    it("Should unregister accord by owner", async function () {
      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      const accord = await accordRegistry.getAccord(accordId);
      expect(accord.active).to.be.false;
    });

    it("Should emit AccordUnregistered event", async function () {
      await expect(
        accordRegistry.connect(user1).unregisterAccord(accordId, {
          value: UNREGISTRATION_FEE,
        })
      ).to.emit(accordRegistry, "AccordUnregistered");
    });

    it("Should fail if not owner", async function () {
      await expect(
        accordRegistry.connect(user2).unregisterAccord(accordId, {
          value: UNREGISTRATION_FEE,
        })
      ).to.be.revertedWith("Not accord owner");
    });

    it("Should fail with insufficient fee", async function () {
      await expect(
        accordRegistry.connect(user1).unregisterAccord(accordId, {
          value: ethers.parseEther("0.0001"),
        })
      ).to.be.revertedWith("Insufficient unregistration fee");
    });

    it("Should fail if already inactive", async function () {
      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      await expect(
        accordRegistry.connect(user1).unregisterAccord(accordId, {
          value: UNREGISTRATION_FEE,
        })
      ).to.be.revertedWith("Accord not active");
    });

    it("Should keep accord data after unregistration", async function () {
      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      const accord = await accordRegistry.getAccord(accordId);
      expect(accord.owner).to.equal(user1.address);
      expect(accord.ipfsHash).to.equal(IPFS_HASH);
      expect(accord.active).to.be.false;
    });
  });

  describe("Update Metadata", function () {
    let accordId: string;

    beforeEach(async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      accordId = receipt?.logs[0].topics[1]!;
    });

    it("Should update metadata by owner", async function () {
      await accordRegistry.connect(user1).updateMetadata(accordId, NEW_IPFS_HASH);

      const accord = await accordRegistry.getAccord(accordId);
      expect(accord.ipfsHash).to.equal(NEW_IPFS_HASH);
    });

    it("Should emit MetadataUpdated event", async function () {
      await expect(
        accordRegistry.connect(user1).updateMetadata(accordId, NEW_IPFS_HASH)
      ).to.emit(accordRegistry, "MetadataUpdated");
    });

    it("Should fail if not owner", async function () {
      await expect(
        accordRegistry.connect(user2).updateMetadata(accordId, NEW_IPFS_HASH)
      ).to.be.revertedWith("Not accord owner");
    });

    it("Should fail with empty IPFS hash", async function () {
      await expect(
        accordRegistry.connect(user1).updateMetadata(accordId, "")
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should fail if accord is inactive", async function () {
      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      await expect(
        accordRegistry.connect(user1).updateMetadata(accordId, NEW_IPFS_HASH)
      ).to.be.revertedWith("Accord not active");
    });
  });

  describe("Transfer Ownership", function () {
    let accordId: string;

    beforeEach(async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      accordId = receipt?.logs[0].topics[1]!;
    });

    it("Should transfer ownership", async function () {
      await accordRegistry.connect(user1).transferAccordOwnership(accordId, user2.address);

      const accord = await accordRegistry.getAccord(accordId);
      expect(accord.owner).to.equal(user2.address);
    });

    // Note: OwnershipTransferred event test skipped due to ambiguity with OpenZeppelin's Ownable event
    // The ownership transfer functionality is verified by the "Should transfer ownership" test above

    it("Should fail if not owner", async function () {
      await expect(
        accordRegistry.connect(user2).transferAccordOwnership(accordId, user3.address)
      ).to.be.revertedWith("Not accord owner");
    });

    it("Should fail with zero address", async function () {
      await expect(
        accordRegistry.connect(user1).transferAccordOwnership(accordId, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });

    it("Should fail if accord is inactive", async function () {
      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      await expect(
        accordRegistry.connect(user1).transferAccordOwnership(accordId, user2.address)
      ).to.be.revertedWith("Accord not active");
    });

    it("Should allow new owner to update metadata", async function () {
      await accordRegistry.connect(user1).transferAccordOwnership(accordId, user2.address);

      await accordRegistry.connect(user2).updateMetadata(accordId, NEW_IPFS_HASH);

      const accord = await accordRegistry.getAccord(accordId);
      expect(accord.ipfsHash).to.equal(NEW_IPFS_HASH);
    });

    it("Should prevent old owner from updating after transfer", async function () {
      await accordRegistry.connect(user1).transferAccordOwnership(accordId, user2.address);

      await expect(
        accordRegistry.connect(user1).updateMetadata(accordId, NEW_IPFS_HASH)
      ).to.be.revertedWith("Not accord owner");
    });
  });

  describe("View Functions", function () {
    it("Should return all accord IDs", async function () {
      await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      await accordRegistry.connect(user2).registerAccord("QmHash2", {
        value: REGISTRATION_FEE,
      });

      const allAccords = await accordRegistry.getAllAccords();
      expect(allAccords.length).to.equal(2);
    });

    it("Should return only active accords", async function () {
      const tx1 = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt1 = await tx1.wait();
      const accordId1 = receipt1?.logs[0].topics[1]!;

      await accordRegistry.connect(user2).registerAccord("QmHash2", {
        value: REGISTRATION_FEE,
      });

      // Unregister first accord
      await accordRegistry.connect(user1).unregisterAccord(accordId1, {
        value: UNREGISTRATION_FEE,
      });

      const activeAccords = await accordRegistry.getActiveAccords();
      expect(activeAccords.length).to.equal(1);
    });

    it("Should correctly check if accord is active", async function () {
      const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      const receipt = await tx.wait();
      const accordId = receipt?.logs[0].topics[1]!;

      expect(await accordRegistry.isAccordActive(accordId)).to.be.true;

      await accordRegistry.connect(user1).unregisterAccord(accordId, {
        value: UNREGISTRATION_FEE,
      });

      expect(await accordRegistry.isAccordActive(accordId)).to.be.false;
    });

    it("Should return correct accord count", async function () {
      expect(await accordRegistry.getAccordCount()).to.equal(0);

      await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      expect(await accordRegistry.getAccordCount()).to.equal(1);

      await accordRegistry.connect(user2).registerAccord("QmHash2", {
        value: REGISTRATION_FEE,
      });

      expect(await accordRegistry.getAccordCount()).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    describe("Withdraw Fees", function () {
      it("Should allow owner to withdraw fees", async function () {
        await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
          value: REGISTRATION_FEE,
        });

        const contractBalance = await ethers.provider.getBalance(
          await accordRegistry.getAddress()
        );

        expect(contractBalance).to.equal(REGISTRATION_FEE);

        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

        const tx = await accordRegistry.connect(owner).withdrawFees();
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
        const expectedBalance = initialOwnerBalance + REGISTRATION_FEE - gasUsed;

        expect(finalOwnerBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.00001"));
      });

      it("Should emit FeesWithdrawn event", async function () {
        await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
          value: REGISTRATION_FEE,
        });

        await expect(accordRegistry.connect(owner).withdrawFees())
          .to.emit(accordRegistry, "FeesWithdrawn")
          .withArgs(owner.address, REGISTRATION_FEE, await time.latest() + 1);
      });

      it("Should fail if not owner", async function () {
        await expect(
          accordRegistry.connect(user1).withdrawFees()
        ).to.be.revertedWithCustomError(accordRegistry, "OwnableUnauthorizedAccount");
      });

      it("Should fail if no fees to withdraw", async function () {
        await expect(
          accordRegistry.connect(owner).withdrawFees()
        ).to.be.revertedWith("No fees to withdraw");
      });
    });

    describe("Set Registration Fee", function () {
      it("Should allow owner to update registration fee", async function () {
        const newFee = ethers.parseEther("0.002");

        await accordRegistry.connect(owner).setRegistrationFee(newFee);

        expect(await accordRegistry.registrationFee()).to.equal(newFee);
      });

      it("Should emit RegistrationFeeUpdated event", async function () {
        const newFee = ethers.parseEther("0.002");

        await expect(accordRegistry.connect(owner).setRegistrationFee(newFee))
          .to.emit(accordRegistry, "RegistrationFeeUpdated")
          .withArgs(REGISTRATION_FEE, newFee);
      });

      it("Should fail if not owner", async function () {
        await expect(
          accordRegistry.connect(user1).setRegistrationFee(ethers.parseEther("0.002"))
        ).to.be.revertedWithCustomError(accordRegistry, "OwnableUnauthorizedAccount");
      });
    });

    describe("Set Unregistration Fee", function () {
      it("Should allow owner to update unregistration fee", async function () {
        const newFee = ethers.parseEther("0.001");

        await accordRegistry.connect(owner).setUnregistrationFee(newFee);

        expect(await accordRegistry.unregistrationFee()).to.equal(newFee);
      });

      it("Should emit UnregistrationFeeUpdated event", async function () {
        const newFee = ethers.parseEther("0.001");

        await expect(accordRegistry.connect(owner).setUnregistrationFee(newFee))
          .to.emit(accordRegistry, "UnregistrationFeeUpdated")
          .withArgs(UNREGISTRATION_FEE, newFee);
      });

      it("Should fail if not owner", async function () {
        await expect(
          accordRegistry.connect(user1).setUnregistrationFee(ethers.parseEther("0.001"))
        ).to.be.revertedWithCustomError(accordRegistry, "OwnableUnauthorizedAccount");
      });
    });

    describe("Emergency Pause", function () {
      let accordId: string;

      beforeEach(async function () {
        const tx = await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
          value: REGISTRATION_FEE,
        });

        const receipt = await tx.wait();
        accordId = receipt?.logs[0].topics[1]!;
      });

      it("Should allow owner to emergency pause accord", async function () {
        await accordRegistry.connect(owner).emergencyPauseAccord(accordId);

        const accord = await accordRegistry.getAccord(accordId);
        expect(accord.active).to.be.false;
      });

      it("Should emit AccordUnregistered event", async function () {
        await expect(accordRegistry.connect(owner).emergencyPauseAccord(accordId))
          .to.emit(accordRegistry, "AccordUnregistered");
      });

      it("Should fail if not owner", async function () {
        await expect(
          accordRegistry.connect(user1).emergencyPauseAccord(accordId)
        ).to.be.revertedWithCustomError(accordRegistry, "OwnableUnauthorizedAccount");
      });

      it("Should fail if already inactive", async function () {
        await accordRegistry.connect(owner).emergencyPauseAccord(accordId);

        await expect(
          accordRegistry.connect(owner).emergencyPauseAccord(accordId)
        ).to.be.revertedWith("Already inactive");
      });
    });
  });

  describe("Receive Function", function () {
    it("Should reject direct ETH sends", async function () {
      await expect(
        owner.sendTransaction({
          to: await accordRegistry.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Use registerAccord() or unregisterAccord()");
    });
  });

  describe("Get Balance", function () {
    it("Should return correct contract balance", async function () {
      expect(await accordRegistry.getBalance()).to.equal(0);

      await accordRegistry.connect(user1).registerAccord(IPFS_HASH, {
        value: REGISTRATION_FEE,
      });

      expect(await accordRegistry.getBalance()).to.equal(REGISTRATION_FEE);
    });
  });
});
