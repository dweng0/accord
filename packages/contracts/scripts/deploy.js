const hre = require("hardhat");

async function main() {
  console.log("Deploying AccordRegistry contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy AccordRegistry
  const AccordRegistry = await hre.ethers.getContractFactory("AccordRegistry");
  const accordRegistry = await AccordRegistry.deploy();

  await accordRegistry.waitForDeployment();

  const contractAddress = await accordRegistry.getAddress();

  console.log("✅ AccordRegistry deployed to:", contractAddress);
  console.log("\nContract Info:");
  console.log("- Registration Fee:", hre.ethers.formatEther(await accordRegistry.registrationFee()), "ETH");
  console.log("- Unregistration Fee:", hre.ethers.formatEther(await accordRegistry.unregistrationFee()), "ETH");
  console.log("- Owner:", await accordRegistry.owner());

  // Save deployment info
  const network = hre.network.name;
  console.log("\n📝 Deployment Summary:");
  console.log(`Network: ${network}`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Transaction: ${accordRegistry.deploymentTransaction()?.hash}`);

  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await accordRegistry.deploymentTransaction()?.wait(5);
    console.log("✅ Confirmed!");

    console.log("\n📋 To verify on Basescan, run:");
    console.log(`npx hardhat verify --network ${network} ${contractAddress}`);
  }

  return {
    contractAddress,
    deployer: deployer.address,
    network,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
