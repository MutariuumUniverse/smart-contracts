const { ethers } = require("hardhat");
const {signVoucher, signMultiVoucher} = require('../../utils/vouchers');

const shardAddress = process.env.SHARDS_ADDRESS;
const citizenAddress = process.env.CITIZEN_ADDRESS;

const version = '1'
const czName = 'MU Citizen';
const bsName = 'MU Black Shard';

async function main() {
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const shardFactory = await ethers.getContractFactory('BlackMarketShard')
  const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
  const shard = shardFactory.attach(shardAddress).connect(signer);
  const citizen = citizenFactory.attach(citizenAddress).connect(signer);

  const nextBS = 0;
  for (let i = 0; i < 10; i++) {
    const voucher = {
      tokenId: nextBS + i,
      price: 0,
      buyer: signer.address,
      currBlockNumber: await ethers.provider.getBlockNumber(),
    }
    const signature = await signVoucher(bsName, version, voucher, shard, signers[0]);
    const { events } = await (await shard.redeem(voucher, signature)).wait();
    console.log('Minted Shard', events.filter(e => e.event === 'Transfer').map(e => e.args.tokenId.toString()));
  }

  for (let i = 0; i < 2; i++) {
    const voucher = {
      buyer: signer.address,
      price: 0,
      amount: 100,
      tokens: [
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' },
        { nftId: 'yo' }
      ],
      currBlockNumber: await ethers.provider.getBlockNumber(),
    }
    const signature = await signMultiVoucher(czName, version, voucher, citizen, signers[0]);
    const { events } = await (await citizen.redeemMulti(voucher, signature)).wait();
    console.log('Minted Citizen', events.filter(e => e.event === 'Transfer').map(e => e.args.tokenId.toString()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
