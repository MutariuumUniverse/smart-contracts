require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const accounts = [process.env.DEPLOYER_KEY];
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: process.env.NODE_ENV,
  networks: {
    goerli: {
      accounts,
      url: 'https://rpc.ankr.com/eth_goerli'
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

};
