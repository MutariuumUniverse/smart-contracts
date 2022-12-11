const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();

  await signers[0].sendTransaction({
    to: '0xCfaB2D1BcDd5f8C0F4E7fdb1900550AB15dF78F9',
    value: ethers.utils.parseEther('3')
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
