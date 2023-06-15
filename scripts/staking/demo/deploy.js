const { ethers } = require("hardhat");

const version = '1'

async function main() {
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
  const staking = await stakingFactory.connect(signer).deploy();
  await staking.deployed();
  const shard = await shardFactory.connect(signer).deploy(
    signers[0].address,
    'MU Black Shard',
    'MBS',
    'https://api.play.mutariuum.com/mint/nft/black-market-shard/metadata',
    0,
    version
  );
  await shard.deployed();
  const citizen = await citizenFactory.connect(signer).deploy(
    signers[0].address,
    'MU Citizen',
    'MUC',
    'https://api.play.mutariuum.com/mint/nft/citizen/metadata',
    0,
    version
  );
  await citizen.deployed();

  console.log(
    `SHARDS_ADDRESS=${shard.address}\n` +
    `SHARDS_DEPLOYED_AT_BLOCK=${shard.deployTransaction.blockNumber}\n` +
    `CITIZEN_ADDRESS=${citizen.address}\n` +
    `CITIZEN_DEPLOYED_AT_BLOCK=${citizen.deployTransaction.blockNumber}\n` +
    `STAKING_ADDRESS=${staking.address}\n` +
    `STAKING_DEPLOYED_AT_BLOCK=${staking.deployTransaction.blockNumber}\n`
  )
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
