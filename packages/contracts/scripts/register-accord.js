const hre = require("hardhat");

/**
 * Register a new Accord
 * Usage: node scripts/register-accord.js <contract-address> <ipfs-hash>
 */

async function main() {
  const contractAddress = process.argv[2];
  const ipfsHash = process.argv[3];

  if (!contractAddress || !ipfsHash) {
    console.error("❌ Missing arguments");
    console.error("Usage: node scripts/register-accord.js <contract-address> <ipfs-hash>");
    console.error("Example: node scripts/register-accord.js 0x123... QmAbc123...");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();

  console.log("Registering Accord...");
  console.log("Contract:", contractAddress);
  console.log("IPFS Hash:", ipfsHash);
  console.log("Signer:", signer.address);

  // Get contract instance
  const AccordRegistry = await hre.ethers.getContractFactory("AccordRegistry");
  const contract = AccordRegistry.attach(contractAddress);

  // Get registration fee
  const registrationFee = await contract.registrationFee();
  console.log("\nRegistration Fee:", hre.ethers.formatEther(registrationFee), "ETH");

  // Check balance
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Your Balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance < registrationFee) {
    console.error("❌ Insufficient balance!");
    process.exit(1);
  }

  // Register accord
  console.log("\n⏳ Registering...");
  const tx = await contract.registerAccord(ipfsHash, {
    value: registrationFee,
  });

  console.log("Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Confirmed!");

  // Extract accordId from event
  const event = receipt.logs.find(
    (log) => log.topics[0] === hre.ethers.id("AccordRegistered(bytes32,address,string,uint256)")
  );

  if (event) {
    const accordId = event.topics[1];
    console.log("\n🎉 Accord Registered!");
    console.log("Accord ID:", accordId);
    console.log("Owner:", signer.address);
    console.log("IPFS Hash:", ipfsHash);

    // Get accord details
    const accord = await contract.getAccord(accordId);
    console.log("\nAccord Details:");
    console.log("- Active:", accord.active);
    console.log("- Created:", new Date(Number(accord.createdAt) * 1000).toLocaleString());

    console.log("\n✅ You can now use this Accord ID to join the accord!");
  } else {
    console.log("✅ Transaction successful but couldn't parse event");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
