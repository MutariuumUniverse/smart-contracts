require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const accounts = [process.env.DEPLOYER_KEY, process.env.MINTER_KEY];
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: process.env.NODE_ENV,
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
