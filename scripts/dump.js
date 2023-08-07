const { config, ethers } = require('hardhat');

async function main() {
  const accounts = config.networks.hardhat.accounts;
  const wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + '/1');
  const privateKey = wallet.privateKey
  console.log(privateKey);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
