require("dotenv").config();
require('hardhat-contract-sizer');
require("@nomicfoundation/hardhat-toolbox");

const accounts = [process.env.DEPLOYER_KEY, process.env.MINTER_KEY].filter(Boolean);
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.17'
      },
      {
        version: '0.8.19'
      }
    ]
  },
  defaultNetwork: process.env.NODE_ENV ?? 'hardhat',
  networks: {
    goerli: {
      accounts,
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
    },
    polygonMumbai: {
      accounts,
      url: 'https://rpc.ankr.com/polygon_mumbai'
    },
    mainnet: {
      accounts,
      url: 'https://rpc.ankr.com/eth'
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
