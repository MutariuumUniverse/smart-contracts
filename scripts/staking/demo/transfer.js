const { ethers } = require("hardhat");

const shardAddress = process.env.SHARDS_ADDRESS;
const citizenAddress = process.env.CITIZEN_ADDRESS;

async function main() {
  const signers = await ethers.getSigners();
  const shard = (await ethers.getContractFactory('BlackMarketShard')).attach(shardAddress);
  const citizen = (await ethers.getContractFactory('MutariuumCitizens')).attach(citizenAddress);

  for (let i = 0; i < 3; i++) {
    const { events } = await (await shard.transferFrom(signers[0].address, process.env.DEPLOYER_ADDRESS, i)).wait();
    const transfer = events.find(e => e.event === 'Transfer');
    const { tokenId } = transfer.args;
    console.log('Transfered Shard', tokenId.toNumber());
  }

  for (let i = 0; i < 9; i++) {
    const { events } = await (await citizen.transferFrom(signers[0].address, process.env.DEPLOYER_ADDRESS, i)).wait();
    const transfer = events.find(e => e.event === 'Transfer');
    const { tokenId } = transfer.args;
    console.log('Transfered Citizen', tokenId.toNumber());
  }

  await signers[0].sendTransaction({
    to: process.env.DEPLOYER_ADDRESS,
    value: ethers.utils.parseEther('32')
  });
  console.log('Sent 32 eth');

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
