const { ethers } = require("hardhat");

const shardAddress = process.env.SHARDS_ADDRESS;
const citizenAddress = process.env.CITIZEN_ADDRESS;
const stakingAddress = process.env.STAKING_ADDRESS;

async function main() {
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');

  const signers = await ethers.getSigners();
  const signer = signers[0];
  const staking = stakingFactory.attach(stakingAddress).connect(signer);

  await (await staking.setStakingStatus(shardAddress, true, true)).wait();
  console.log('Staking enabled for Shards');
  await (await staking.setStakingStatus(citizenAddress, true, true)).wait();
  console.log('Staking enabled for Citizen');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
