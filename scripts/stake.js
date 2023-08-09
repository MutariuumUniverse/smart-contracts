const { attachContracts } = require('../utils/deployment');

async function main() {
  const context = await attachContracts();
  const { signers, citizen, shard, land, staking} = context;
  const shardsPerSigner = 5;
  const landsPerSigner = 7;
  const citizensPerSigner = 20;
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const stakingShards = [];
    const stakingCitizens = [];
    const stakingLands = [];
    for (let tokenId = shardsPerSigner * i; tokenId < shardsPerSigner * (i + 1); tokenId++) {
      stakingShards.push(tokenId);
    }
    for (let tokenId = citizensPerSigner * i; tokenId < citizensPerSigner * (i + 1); tokenId++) {
      stakingCitizens.push(tokenId);
    }
    for (let tokenId = landsPerSigner * i; tokenId < landsPerSigner * (i + 1); tokenId++) {
      stakingLands.push(tokenId + 1);
    }
    await staking.connect(signer).stake(shard.address, stakingShards);
    await staking.connect(signer).stake(citizen.address, stakingCitizens);
    await staking.connect(signer).stake(land.address, stakingLands);
  }

  console.log('.env.c.local file written!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
