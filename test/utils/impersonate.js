const { ethers } = require('hardhat');

async function runAs(address, run) {
  await ethers.provider.send('hardhat_impersonateAccount', [address]);
  const signer = await ethers.getSigner(address);
  const result = await run(signer);
  await ethers.provider.send('hardhat_stopImpersonatingAccount', [address]);
  return result;
}
async function getDeployer() {
  const signers = await ethers.getSigners();
  if (!process.env.DEPLOYER_ADDRESS) return signers[0].address;
  await ethers.provider.send('hardhat_setBalance', [
    process.env.DEPLOYER_ADDRESS,
    ethers.utils.parseEther('1000')._hex
  ]);
  return process.env.DEPLOYER_ADDRESS
}

async function runAsDeployer(run) {
  const deployer = await getDeployer();
  return runAs(deployer, run);
}

module.exports = {
  runAsDeployer,
  runAs
};
