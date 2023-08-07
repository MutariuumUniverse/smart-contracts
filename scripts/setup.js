const fs = require('fs');
const { ethers } = require('hardhat');
const { deployContracts, enableStaking, massMint } = require('../utils/deployment');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  while(true) {
    const ready = await ethers.provider.getBlockNumber().catch(() => null);
    console.log({ ready });
    if (ready !== null) {
      break;
    }
    await wait(400);
  }
  const context = await deployContracts();
  await enableStaking(context);
  await massMint(context);

  await fs.promises.writeFile('.env.c.local', [
    'ETH_RPC=http://host.docker.internal:8545',
    '',
    `SHARDS_ADDRESS=${context.shard.address}`,
    'SHARDS_DEPLOYED_AT_BLOCK=1',
    `CITIZEN_ADDRESS=${context.citizen.address}`,
    'CITIZEN_DEPLOYED_AT_BLOCK=1',
    `LAND_ADDRESS=${context.land.address}`,
    'LAND_DEPLOYED_AT_BLOCK=1',
    `STAKING_ADDRESS=${context.staking.address}`,
    'STAKING_DEPLOYED_AT_BLOCK=1',
    `GIVEAWAY_ADDRESS=${context.giveaways.address}`,
    'GIVEAWAY_DEPLOYED_AT_BLOCK=1',
    '',
    `GIVEAWAYS_APPROVER_KEY=${context.privateKeys[1]}`,
    ''
  ].join('\n'));

  console.log('.env.c.local file written!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
