const { ethers } = require("hardhat");
const {runAsDeployer} = require('../../utils/impersonate');

const shardAddress = process.env.SHARDS_ADDRESS;
const citizenAddress = process.env.CITIZEN_ADDRESS;
const stakingAddress = process.env.STAKING_ADDRESS;

async function main() {
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')

  const shard = shardFactory.attach(shardAddress).connect(signer);
  const citizen = citizenFactory.attach(citizenAddress).connect(signer);
  await (await shard.setApprovalForAll(stakingAddress, true)).wait();
  console.log('Approved Staking on Shard');
  await (await citizen.setApprovalForAll(stakingAddress, true)).wait();
  console.log('Approved Staking on Citizen');
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const staking = stakingFactory.attach(stakingAddress).connect(signer);

  await (await staking.stake(shardAddress, [300, 301])).wait();
  await (await staking.stake(citizenAddress, [10000, 10001, 10002])).wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
