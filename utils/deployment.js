const path = require('path');
const { ethers, config } = require('hardhat');
const { signVoucher, signMultiVoucher } = require('../test/utils/vouchers');
const MockApi = require('./MockApi');

function loadPrivateKeys(signers) {
  const accounts = config.networks.hardhat.accounts;
  const privateKeys = [];
  for (let i = 0; i < signers.length; i++) {
    const wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${i}`);
    privateKeys[i] = wallet.privateKey;
  }
  return privateKeys;
}
async function attachContracts() {
  const signers = await ethers.getSigners();
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
  const landsFactory = await ethers.getContractFactory('MutariuumLand');
  const giveawaysFactory = await ethers.getContractFactory('MutariuumGiveaways');
  const env = require('dotenv').config({ path: path.join(__dirname, '..', '.env.c.local') }).parsed;
  const citizen = citizenFactory.attach(env.CITIZEN_ADDRESS);
  const shard = await shardFactory.attach(env.SHARDS_ADDRESS);
  const staking = await stakingFactory.attach(env.STAKING_ADDRESS);
  const land = await landsFactory.attach(env.LAND_ADDRESS);
  const giveaways = await giveawaysFactory.attach(env.GIVEAWAY_ADDRESS);

  const privateKeys = loadPrivateKeys(signers);

  return {
    signers,
    privateKeys,
    shard,
    citizen,
    staking,
    giveaways,
    land
  };
}

async function deployContracts() {
  const version = '1';
  const signers = await ethers.getSigners();
  const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
  const landsFactory = await ethers.getContractFactory('MutariuumLand');
  const giveawaysFactory = await ethers.getContractFactory('MutariuumGiveaways');
  console.log('Deploying citizens');
  const citizen = await citizenFactory.deploy(
    signers[1].address,
    'MU Citizen',
    'MUC',
    'http://metadata.mutariuum.local/mint/nft/citizen/metadata',
    0,
    version
  );
  await citizen.deployed();

  console.log('Deploying shards');
  const shard = await shardFactory.deploy(
    signers[1].address,
    'MU Black Shard',
    'MBS',
    'http://metadata.mutariuum.local/mint/nft/black-market-shard/metadata',
    700,
    version
  );
  await shard.deployed();


  console.log('Deploying staking');
  const staking = await stakingFactory.deploy();
  await staking.deployed();

  console.log('Deploying land');
  const land = await landsFactory.deploy(signers[1].address, staking.address);
  await land.deployed();

  await (await land.setBaseURI('http://metadata.mutariuum.local/mint/nft/land/metadata/')).wait();

  console.log('Deploying giveaways');
  const giveaways = await giveawaysFactory.deploy();
  await giveaways.deployed();

  await giveaways.setRole(signers[1].address, 1, true);

  const privateKeys = loadPrivateKeys(signers);

  return {
    signers,
    privateKeys,
    shard,
    citizen,
    staking,
    giveaways,
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

module.exports = {
  deployContracts,
  attachContracts,
  massMint,
  enableStaking
}
