const hre = require("hardhat");

/**
 * Example script to interact with deployed AccordRegistry
 * Usage: node scripts/interact.js <contract-address>
 */

async function main() {
  const contractAddress = process.argv[2];

  if (!contractAddress) {
    console.error("❌ Please provide contract address");
    console.error("Usage: node scripts/interact.js <contract-address>");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();

  console.log("Interacting with AccordRegistry at:", contractAddress);
  console.log("Using account:", signer.address);

  // Get contract instance
  const AccordRegistry = await hre.ethers.getContractFactory("AccordRegistry");
  const contract = AccordRegistry.attach(contractAddress);

  // Get contract info
  console.log("\n📊 Contract Info:");
  console.log("Owner:", await contract.owner());
  console.log("Registration Fee:", hre.ethers.formatEther(await contract.registrationFee()), "ETH");
  console.log("Unregistration Fee:", hre.ethers.formatEther(await contract.unregistrationFee()), "ETH");
  console.log("Total Accords:", (await contract.getAccordCount()).toString());
  console.log("Contract Balance:", hre.ethers.formatEther(await contract.getBalance()), "ETH");

  // Get all accords
  const accordIds = await contract.getAllAccords();
  console.log("\n📋 All Accords:", accordIds.length);

  if (accordIds.length > 0) {
    console.log("\nAccord Details:");
    for (let i = 0; i < Math.min(accordIds.length, 5); i++) {
      const accord = await contract.getAccord(accordIds[i]);
      console.log(`\n  [${i + 1}] ${accordIds[i]}`);
      console.log(`      Owner: ${accord.owner}`);
      console.log(`      IPFS Hash: ${accord.ipfsHash}`);
      console.log(`      Active: ${accord.active}`);
      console.log(`      Created: ${new Date(Number(accord.createdAt) * 1000).toLocaleString()}`);
    }

    if (accordIds.length > 5) {
      console.log(`\n  ... and ${accordIds.length - 5} more`);
    }
  }

  // Get active accords
  const activeAccords = await contract.getActiveAccords();
  console.log("\n✅ Active Accords:", activeAccords.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
