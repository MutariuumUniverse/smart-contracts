const { ethers } = require("hardhat");

async function main() {
  const blockNumber = await ethers.provider.getBlockNumber();

  console.log(blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
