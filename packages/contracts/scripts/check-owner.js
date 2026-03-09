const hre = require("hardhat");

async function main() {
  // Get the deployed contract address from your previous deployment
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Get contract factory and attach to the deployed address
  const AccordRegistry = await hre.ethers.getContractFactory("AccordRegistry");
  const contract = AccordRegistry.attach(contractAddress);

  try {
    // Try to get the owner
    const owner = await contract.owner();
    console.log("Contract owner:", owner);

    // Get other properties
    console.log("Registration fee:", hre.ethers.formatEther(await contract.registrationFee()));
    console.log("Unregistration fee:", hre.ethers.formatEther(await contract.unregistrationFee()));
    console.log("Accord count:", (await contract.getAccordCount()).toString());

    // Test registering an accord
    console.log("\nTesting registration...");
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);

    const tx = await contract.registerAccord("QmTestHash12345", { value: hre.ethers.parseEther("0.001") });
    await tx.wait();
    
    console.log("Registration successful!");
    console.log("Transaction hash:", tx.hash);
    
    // Get the accord count after registration
    console.log("New accord count:", (await contract.getAccordCount()).toString());
  } catch (error) {
    console.error("Error interacting with contract:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });