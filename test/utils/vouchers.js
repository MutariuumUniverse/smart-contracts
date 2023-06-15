const {ethers} = require('hardhat');

const NFTVoucherTypes = {
  NFTVoucher: [
    { name: 'tokenId', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'currBlockNumber', type: 'uint256' },
  ],
};

const NFTVoucherArrayTypes = {
  NFTVoucherArray: [
    { name: 'buyer', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'tokens', type: 'NFTVoucher[]' },
    { name: 'currBlockNumber', type: 'uint256' },
  ],
  NFTVoucher: [{ name: 'nftId', type: 'string' }],
};

const signVoucher = async (name, version, voucher, contract, signer) => {
  const { chainId } = await ethers.provider.getNetwork();
  const domain = {
    name,
    version,
    verifyingContract: contract.address,
    chainId
  };
  return signer._signTypedData(domain, NFTVoucherTypes, voucher);
}

const signMultiVoucher = async (name, version, voucher, contract, signer) => {
  const { chainId } = await ethers.provider.getNetwork();
  const domain = {
    name,
    version,
    verifyingContract: contract.address,
    chainId
  };
  return signer._signTypedData(domain, NFTVoucherArrayTypes, voucher);
}

module.exports = {
  signVoucher,
  signMultiVoucher
}
