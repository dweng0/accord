const hre = require("hardhat");

async function main() {
  console.log("Deploying and testing AccordRegistry contract...\n");

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

  console.log("\n✅ AccordRegistry deployed to:", contractAddress);

  console.log("\n--- Testing contract functions ---");
  
  // Test getting the owner (should work since we just deployed)
  try {
    const owner = await accordRegistry.owner();
    console.log("Contract owner:", owner);
    
    const registrationFee = await accordRegistry.registrationFee();
    console.log("Registration fee:", hre.ethers.formatEther(registrationFee), "ETH");
    
    const unregistrationFee = await accordRegistry.unregistrationFee();
    console.log("Unregistration fee:", hre.ethers.formatEther(unregistrationFee), "ETH");
    
    const accordCount = await accordRegistry.getAccordCount();
    console.log("Initial accord count:", accordCount.toString());
  } catch (error) {
    console.error("Error calling view functions:", error.message);
  }

  // Test registering an accord
  console.log("\n--- Testing registration ---");
  try {
    const ipfsHash = "QmTestHash12345";
    const tx = await accordRegistry.registerAccord(ipfsHash, { 
      value: hre.ethers.parseEther("0.001") 
    });
    console.log("Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("✅ Registration successful!");
    console.log("Transaction hash:", tx.hash);
    
    const newAccordCount = await accordRegistry.getAccordCount();
    console.log("New accord count:", newAccordCount.toString());
    
    // Get all accords
    const allAccords = await accordRegistry.getAllAccords();
    console.log("Total accords after registration:", allAccords.length);
    
    if (allAccords.length > 0) {
      const firstAccord = await accordRegistry.getAccord(allAccords[0]);
      console.log("First accord owner:", firstAccord.owner);
      console.log("First accord IPFS hash:", firstAccord.ipfsHash);
      console.log("First accord active:", firstAccord.active);
    }
  } catch (error) {
    console.error("Error during registration:", error.message);
    console.error("Full error:", error);
  }

  console.log("\n--- Full Test Summary ---");
  console.log("Contract deployed at:", contractAddress);
  console.log("Deployer address:", deployer.address);
  console.log("Contract ready for use on local network!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });