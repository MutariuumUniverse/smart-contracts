const { ethers } = require("hardhat");

async function main() {
  const signer = new ethers.Wallet(process.env.SIGNER_KEY);
  const Land = await ethers.getContractFactory("MutariuumLand");
  const land = await Land.deploy(signer.address);

  await land.deployed();

  console.log('Deployed land', land.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
