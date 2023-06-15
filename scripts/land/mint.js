const { ethers } = require("hardhat");
const MockApi = require('../utils/MockApi');
const signer = new ethers.Wallet(process.env.SIGNER_KEY, ethers.provider);

async function main() {
  const signers = await ethers.getSigners();
  const Land = await ethers.getContractFactory("MutariuumLand");
  const land = Land.attach('0x202DA79fEC744BAF4CD26e9C75cDc16be9C53145');
  const api = new MockApi(signer, land);

  {
    const minter = signers[0];
    const blockNumber = await ethers.provider.getBlockNumber();
    const signature = await api.approveMint(minter.address, 0, 7, blockNumber);
    console.log('Approved mint:', blockNumber, signature);
    const tx = await land.connect(minter).mint(0, 7, blockNumber, signature);
    const { events } = await tx.wait();
    console.log(events.filter(e => e.event === 'Transfer').length, 'Transfers');
    console.log(`https://goerli.etherscan.io/tx/${tx.hash}`);
  }
  {
    const minter = signers[1];
    const blockNumber = await ethers.provider.getBlockNumber();
    const signature = await api.approveMint(minter.address, 0, 7, blockNumber);
    const tx = await land.connect(minter).mint(0, 7, blockNumber, signature);
    const { events } = await tx.wait();
    console.log(events.filter(e => e.event === 'Transfer').length, 'Transfers');
    console.log(`https://goerli.etherscan.io/tx/${tx.hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
