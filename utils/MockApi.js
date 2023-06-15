const { ethers } = require('ethers');

class MockApi {
  constructor(wallet, contract) {
    this.wallet = new ethers.Wallet(process.env.SIGNER_KEY, contract.provider);
    this.contract = contract.connect(this.wallet);
  }

  async approveMint(minter, value, quantity, blockNumber) {
    const nonce = await this.contract.getMintCount(minter);
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
      [minter, nonce, value, quantity, blockNumber]
    );
    return this.wallet.signMessage(ethers.utils.arrayify(message));
  }

  async approveTestnetMint(minter, value, quantity, blockNumber) {
    const nonce = await this.contract.getBurnCount(minter);
    const totalSupply = await this.contract.totalSupply();
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [minter, nonce, value, totalSupply, quantity, blockNumber]
    );
    return this.wallet.signMessage(ethers.utils.arrayify(message));
  }

  async approveRefund(minter, value, startId, quantity, blockNumber) {
    const nonce = await this.contract.getBurnCount(minter);
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [minter, nonce, value, startId, quantity, blockNumber]
    );
    return this.wallet.signMessage(ethers.utils.arrayify(message));
  }
}

module.exports = MockApi;
