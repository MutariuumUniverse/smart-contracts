const { ethers } = require('hardhat');

ethers.getSigners().then(s => console.log(s.map(w => w.address)));
