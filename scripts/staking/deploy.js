const { ethers } = require("hardhat");

async function main() {
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const staking = await stakingFactory.deploy();
  await staking.deployed();

  const blockNumber = await ethers.provider.getBlockNumber();

  console.log(
    `STAKING_ADDRESS=${staking.address}\n` +
    `STAKING_DEPLOYED_AT_BLOCK=${blockNumber}`
  )
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
