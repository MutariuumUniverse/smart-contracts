const { ethers } = require("hardhat");

async function main() {
  const errors = [];
  if (!process.env.SIGNER_KEY) {
    errors.push('SIGNER_KEY must be set in your env file');
  }
  if (!process.env.STAKING_ADDRESS) {
    errors.push('STAKING_ADDRESS must be set in your env file');
  }
  if (errors.length > 0) {
    throw new Error(errors.map(e => `\n\t- ${e}`).join(''));
  }
  const signer = new ethers.Wallet(process.env.SIGNER_KEY);
  const Land = await ethers.getContractFactory("MutariuumLand");
  const land = await Land.deploy(signer.address, process.env.STAKING_ADDRESS);

  await land.deployed();

  console.log(`Lands deployed at address ${land.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
