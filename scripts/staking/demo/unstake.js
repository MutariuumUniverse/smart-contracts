const { ethers } = require("hardhat");
const {runAsDeployer} = require('../../utils/impersonate');

const shardAddress = process.env.SHARDS_ADDRESS;
const citizenAddress = process.env.CITIZEN_ADDRESS;
const stakingAddress = process.env.STAKING_ADDRESS;

async function main() {
  await runAsDeployer(async (signer) => {
    const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
    const staking = stakingFactory.attach(stakingAddress).connect(signer);

    await (await staking.unstake(shardAddress, [300])).wait();
  })
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
