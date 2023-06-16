const fs = require('fs');
const { ethers } = require('hardhat');
const {signVoucher, signMultiVoucher} = require('../test/utils/vouchers');
const MockApi = require('../utils/MockApi');

async function main() {
  const context = await deployContracts();
  await enableStaking(context);
  await massMint(context);
}

async function deployContracts() {
  console.log('Deploying contracts');
  const version = '1';
  const signers = await ethers.getSigners();
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
  const landsFactory = await ethers.getContractFactory('MutariuumLand');
  const giveawaysFactory = await ethers.getContractFactory('MutariuumGiveaways');
  const shard = await shardFactory.deploy(
    signers[1].address,
    'MU Black Shard',
    'MBS',
    'http://metadata.mutariuum.local/mint/nft/black-market-shard/metadata',
    0,
    version
  );
  await shard.deployed();

  const citizen = await citizenFactory.deploy(
    signers[1].address,
    'MU Citizen',
    'MUC',
    'http://metadata.mutariuum.local/mint/nft/citizen/metadata',
    0,
    version
  );
  await citizen.deployed();

  const staking = await stakingFactory.deploy();
  await staking.deployed();
  const land = await landsFactory.deploy(signers[1].address, staking.address);
  await land.deployed();

  await (await land.setBaseURI('http://metadata.mutariuum.local/mint/nft/land/metadata/')).wait();

  const giveaways = await giveawaysFactory.deploy();
  await giveaways.deployed();

  await giveaways.setRole(signers[1].address, 1, true);

  await fs.promises.writeFile('.env.c.local', [
    'ETH_RPC=http://host.docker.internal:8545',
    '',
    `SHARDS_ADDRESS=${shard.address}`,
    'SHARDS_DEPLOYED_AT_BLOCK=1',
    `CITIZEN_ADDRESS=${citizen.address}`,
    'CITIZEN_DEPLOYED_AT_BLOCK=1',
    `LAND_ADDRESS=${land.address}`,
    'LAND_DEPLOYED_AT_BLOCK=1',
    `STAKING_ADDRESS=${staking.address}`,
    'STAKING_DEPLOYED_AT_BLOCK=1',
    `GIVEAWAY_ADDRESS=${giveaways.address}`,
    'GIVEAWAY_DEPLOYED_AT_BLOCK=1',
    '',
    'GIVEAWAYS_APPROVER_KEY=59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    ''
  ].join('\n'));

  console.log('.env.c.local file written!');

  return {
    signers,
    shard,
    citizen,
    staking,
    land
  };
}

async function enableStaking(context) {
  console.log('Enabling staking');
  const {
    signers,
    shard,
    citizen,
    staking,
    land
  } = context;

  const deployer = signers[0];
  await (await staking.connect(deployer).setStakingStatus(shard.address, true, true)).wait();
  await (await staking.connect(deployer).setStakingStatus(citizen.address, true, true)).wait();
  await (await staking.connect(deployer).setStakingStatus(land.address, true, true)).wait();

  console.log('Approving staking contract on all 3 contracts');
  for (const signer of signers) {
    for (const contract of [shard, citizen, land]) {
      await (await contract.connect(signer).setApprovalForAll(staking.address, true)).wait();
    }
  }
}

async function massMint(context) {
  console.log('Mass minting');
  const {
    signers,
    shard,
    citizen,
    land
  } = context;
  let shardsIds = 0;

  for (const signer of signers) {
    console.log('Minting for signer', signer.address);
    await mintBlackShards(shard, signers[1], signer, shardsIds, 5);
    shardsIds += 5;
    await mintCitizens(citizen, signers[1], signer, 20);
    await mintLands(land, signers[1], signer, 7);
  }
}

async function mintBlackShards(contract, signer, to, startTokenId, amount) {
  for (let i = 0; i < amount; i++) {
    const voucher = {
      tokenId: startTokenId + i,
      price: 0,
      buyer: to.address,
      currBlockNumber: await ethers.provider.getBlockNumber(),
    }
    const signature = await signVoucher('MU Black Shard', '1', voucher, contract, signer);
    await (await contract.connect(to).redeem(voucher, signature)).wait();
  }
}

async function mintCitizens(contract, signer, to, amount) {
  const voucher = {
    buyer: to.address,
    price: 0,
    amount: amount,
    tokens: new Array(amount).fill(0).map(() => ({ nftId: 'yo' })),
    currBlockNumber: await ethers.provider.getBlockNumber(),
  }
  const signature = await signMultiVoucher('MU Citizen', '1', voucher, contract, signer);
  await (await contract.connect(to).redeemMulti(voucher, signature)).wait();
}

async function mintLands(contract, signer, to, amount) {
  const api = new MockApi(signer, contract);
  const blockNumber = await ethers.provider.getBlockNumber();
  const signature = await api.approveMint(to.address, 0, amount, blockNumber);
  await (await contract.connect(to).mint(0, amount, blockNumber, signature, { value: 0 })).wait();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
