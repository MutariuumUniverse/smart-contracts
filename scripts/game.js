const { ethers } = require('hardhat');

async function main() {
  const Core = await ethers.getContractFactory('MutariuumCore');
  const Carver = await ethers.getContractFactory('CarverCity');

  const core = await Core.deploy();
  const city = await Carver.deploy();

  await Promise.all([core.deployed(), city.deployed()]);
  console.log('Core', core.address);
  console.log('City', city.address);
}

main().catch(e => {
  console.log(e);
  process.exit(1);
});
