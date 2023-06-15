if (!['hardhat', 'localhost'].includes(process.env.NODE_ENV)) {
  console.log('You cannot run tests on a live network');
  process.exit(1);
}

const { ethers } = require('hardhat');
const { expect } = require("chai");

const name = 'MU Land';
const symbol = 'MUL';
const baseURI = 'https://api.land.mutariuum.com/metadata/';
const contractName = 'MutariuumLand'
const signer = new ethers.Wallet(process.env.SIGNER_KEY, ethers.provider);
const deployArgs = [signer.address, signer.address];

const MockApi = require('../utils/MockApi');

function InvalidRole(role, address) {
  return `AccessControl: account ${address.toLowerCase()} is missing role ${role}`;
}

describe("Lands", () => {
  let contract;
  let signers;
  let api;
  const MINTER_ROLE = ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']);
  const DEFAULT_ADMIN_ROLE = `0x${'0'.repeat(64)}`;

  before(async () => {
    signers = await ethers.getSigners();
    const Land = await ethers.getContractFactory(contractName);
    contract = await Land.deploy(...deployArgs);

    api = new MockApi(signer, contract);

    await contract.deployed();
  });

  it('Deployed correctly', async () => {
    expect(await contract.name()).to.equal(name);
    expect(await contract.symbol()).to.equal(symbol);
    expect(await contract.contractURI()).to.equal(`${ baseURI }contract.json`);
  });

  describe('Supports Interfaces', () => {
    it('ERC165', async () => {
      expect(await contract.supportsInterface('0x01ffc9a7')).to.equal(true);
    });
    it('ERC721', async () => {
      expect(await contract.supportsInterface('0x80ac58cd')).to.equal(true);
    });
    it('ERC721Metadata', async () => {
      expect(await contract.supportsInterface('0x5b5e139f')).to.equal(true);
    });
    it('AccessControl', async () => {
      expect(await contract.supportsInterface('0x7965db0b')).to.equal(true);
    });
    it('ERC2981', async () => {
      expect(await contract.supportsInterface('0x2a55205a')).to.equal(true);
    });
  });

  describe('Roles', () => {
    it('Admin Role', async () => {
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, signers[0].address)).to.equal(true);
      const wallet = ethers.Wallet.createRandom();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, wallet.address)).to.equal(false);
    });
    it('Minter Role', async () => {
      expect(await contract.hasRole(MINTER_ROLE, signer.address)).to.equal(true);
      const wallet = ethers.Wallet.createRandom();
      expect(await contract.hasRole(MINTER_ROLE, wallet.address)).to.equal(false);
    });
  });

  describe('Lands NFT', () => {
    let snapshotId;
    before(async () => {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
    });
    after(async () => {
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('Cannot mint with the wrong value', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 1, blockNumber);
      await expect(contract.connect(minter).mint(value, 1, blockNumber, signature, {
        value: value.sub(1)
      })).to.be.revertedWithCustomError(
        contract,
        'WrongAmount'
      );
    });

    it('Cannot mint with the wrong quantity', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 1, blockNumber);
      await expect(contract.connect(minter).mint(value, 2, blockNumber, signature, {
        value
      })).to.be.revertedWithCustomError(
        contract,
        'InvalidSignature'
      );
    });

    it('Cannot mint as the wrong minter', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 1, blockNumber);
      await expect(contract.connect(signers[2]).mint(value, 1, blockNumber, signature, {
        value
      })).to.be.revertedWithCustomError(
        contract,
        'InvalidSignature'
      );
    });

    it('Cannot mint with an outdated voucher', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 1, blockNumber);
      await ethers.provider.send("hardhat_mine", ["0x100"]);
      await expect(contract.connect(minter).mint(value, 1, blockNumber, signature, {
        value
      })).to.be.revertedWithCustomError(
        contract,
        'Timeout'
      );
    });

    it('Can mint one', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 1, blockNumber);
      const receipt = await (await contract.connect(minter).mint(value, 1, blockNumber, signature, { value })).wait();
      expect(receipt.events).to.have.lengthOf(1);
      const event = receipt.events.pop();
      expect(event.event).to.equal('Transfer');
      expect(event.args.tokenId).to.equal(1);
      expect(await contract.tokenURI(1)).to.equal(`${baseURI}1.json`);
    });

    it('Can mint two', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 2, blockNumber);
      const receipt = await (await contract.connect(minter).mint(value, 2, blockNumber, signature, { value })).wait();
      expect(receipt.events).to.have.lengthOf(2);
      const [first, second] = receipt.events;
      expect(first.event).to.equal('Transfer');
      expect(first.args.tokenId).to.equal(2);
      expect(second.event).to.equal('Transfer');
      expect(second.args.tokenId).to.equal(3);
      expect(await contract.tokenURI(2)).to.equal(`${baseURI}2.json`);
      expect(await contract.tokenURI(3)).to.equal(`${baseURI}3.json`);
    });

    it('Cannot refund with the wrong start ID', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveRefund(minter.address, value, 1, 2, blockNumber);
      await expect(contract.connect(minter).refund(0, 2, blockNumber, value, signature)).to.be.revertedWithCustomError(
        contract,
        'InvalidSignature'
      );
    });

    it('Cannot refund with the wrong quantity', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveRefund(minter.address, value, 1, 2, blockNumber);
      await expect(contract.connect(minter).refund(1, 3, blockNumber, value, signature)).to.be.revertedWithCustomError(
        contract,
        'InvalidSignature'
      );
    });

    it('Cannot refund with after too long', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveRefund(minter.address, value, 1, 2, blockNumber);
      await ethers.provider.send("hardhat_mine", ["0x100"]);
      await expect(contract.connect(minter).refund(1, 3, blockNumber, value, signature)).to.be.revertedWithCustomError(
        contract,
        'InvalidSignature'
      );
    });

    it('Can refund with the right everything', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveRefund(minter.address, value, 2, 2, blockNumber);
      const { events } = await (await contract.connect(minter).refund(2, 2, blockNumber, value, signature)).wait();
      expect(events).to.have.lengthOf(3);
      expect(events[0].event).to.equal('Transfer');
      expect(events[0].args.from).to.equal(minter.address);
      expect(events[0].args.to).to.equal(ethers.constants.AddressZero);
      expect(events[0].args.tokenId).to.equal(2);
      expect(events[1].event).to.equal('Transfer');
      expect(events[1].args.from).to.equal(minter.address);
      expect(events[1].args.to).to.equal(ethers.constants.AddressZero);
      expect(events[1].args.tokenId).to.equal(3);
      expect(events[2].event).to.equal('Refund');
      expect(events[2].args.to).to.equal(minter.address);
      expect(events[2].args.startTokenId).to.equal(2);
      expect(events[2].args.quantity).to.equal(2);
    });

    it('Users are not able to withdraw', async () => {
      await expect(contract.connect(signers[1]).withdraw(1)).to.be.revertedWith(InvalidRole(
        DEFAULT_ADMIN_ROLE,
        signers[1].address
      ));
    });

    it('Owner can withdraw', async () => {
      const contractBalance = await ethers.provider.getBalance(contract.address);
      const ownerBalance = await ethers.provider.getBalance(signers[0].address);
      const receipt = await (await contract.withdraw(contractBalance)).wait();
      const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);
      expect(await ethers.provider.getBalance(signers[0].address)).to.equal(
        ownerBalance.sub(gasUsed).add(contractBalance)
      );
    });

    it('Users cannot change the baseUri', async () => {
      await expect(contract.connect(signers[1]).setBaseURI('lel')).to.be.revertedWith(InvalidRole(
        DEFAULT_ADMIN_ROLE,
        signers[1].address
      ));
    });

    it('Admin can change the baseURI', async () => {
      await (await contract.setBaseURI('lel')).wait();
      const uri = await contract.tokenURI(1);
      expect(uri).to.equal('lel1.json');
    });

    it('Computes royalties correctly', async () => {
      const price = ethers.utils.parseEther('1');
      const expectedRoyalties = price.mul(750).div(10000);
      const { receiver, royaltyAmount } = await contract.royaltyInfo(1, price);
      expect(receiver).to.equal(contract.address);
      expect(royaltyAmount).to.equal(expectedRoyalties);
    });

    it('Users cannot change royalties', async () => {
      await expect(contract.connect(signers[1]).setRoyalties(signers[1].address, 1000)).to.be.revertedWith(
        InvalidRole(DEFAULT_ADMIN_ROLE, signers[1].address)
      );
    });

    it('Admin can change royalties', async () => {
      const price = ethers.utils.parseEther('1');
      const expectedRoyalties = price.mul(1000).div(10000);
      await (await contract.setRoyalties(signers[0].address, 1000)).wait();
      const { receiver, royaltyAmount } = await contract.royaltyInfo(1, price);
      expect(receiver).to.equal(signers[0].address);
      expect(royaltyAmount).to.equal(expectedRoyalties);
    });

    it('Non-operator cannot move NFTs', async () => {
      const minter = signers[1];
      const mover = signers[2];
      await expect(contract.connect(mover)['safeTransferFrom(address,address,uint256)'](minter.address, mover.address, 1)).to.be.revertedWithCustomError(
        contract,
        'TransferCallerNotOwnerNorApproved'
      );
    });

    it('Staking contract is a global operator', async () => {
      const minter = signers[1];
      await (await minter.sendTransaction({
        to: signer.address,
        value: ethers.utils.parseEther('2')
      })).wait();
      const { events } = await (await contract.connect(signer)['safeTransferFrom(address,address,uint256)'](minter.address, signers[3].address, 1)).wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.equal('Transfer');
      const { from, to, tokenId } = events[0].args;
      expect(from).to.equal(minter.address);
      expect(to).to.equal(signers[3].address);
      expect(tokenId).to.equal(1);
    });

    it('User cannot update the staking contract', async () => {
      await expect(contract.connect(signer).setStakingContract(signers[2].address)).to.be.revertedWith(
        InvalidRole(DEFAULT_ADMIN_ROLE, signer.address)
      );
    });

    it('Admin can update the staking contract', async () => {
      await (await contract.setStakingContract(signers[2].address)).wait();
    });

    it('The old staking contract is no longer an operator', async () => {
      await expect(contract.connect(signer)['safeTransferFrom(address,address,uint256)'](signers[3].address, signers[2].address, 1)).to.be.revertedWithCustomError(
        contract,
        'TransferCallerNotOwnerNorApproved'
      );
    });

    it('The new staking contract is a global operator', async () => {
      const { events } = await (await contract.connect(signers[2])['safeTransferFrom(address,address,uint256)'](signers[3].address, signers[2].address, 1)).wait();
      expect(events).to.have.lengthOf(1);
      expect(events[0].event).to.equal('Transfer');
      const { from, to, tokenId } = events[0].args;
      expect(from).to.equal(signers[3].address);
      expect(to).to.equal(signers[2].address);
      expect(tokenId).to.equal(1);
    });
  });

  describe('Sold Out scenario', () => {
    it('Mint 330', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 330, blockNumber);
      const receipt = await (await contract.connect(minter).mint(value, 330, blockNumber, signature, { value })).wait();
      expect(receipt.events).to.have.lengthOf(330);
      const [first, second] = receipt.events;
      expect(first.event).to.equal('Transfer');
      expect(first.args.tokenId).to.equal(1);
      expect(second.event).to.equal('Transfer');
      expect(second.args.tokenId).to.equal(2);
      expect(await contract.tokenURI(1)).to.equal(`${baseURI}1.json`);
      expect(await contract.tokenURI(2)).to.equal(`${baseURI}2.json`);
    });

    it('Cannot mint 4', async () => {
      const minter = signers[2];
      const value = ethers.utils.parseEther('0.3');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 4, blockNumber);
      await expect(contract.connect(minter).mint(value, 4, blockNumber, signature, { value })).to.be.revertedWithCustomError(
        contract,
        'SoldOut'
      );
    });

    it('Burn 5', async () => {
      const minter = signers[1];
      const value = ethers.utils.parseEther('0.2');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveRefund(minter.address, value, 2, 5, blockNumber);
      const { events } = await (await contract.connect(minter).refund(2, 5, blockNumber, value, signature)).wait();
      expect(events).to.have.lengthOf(6);
      expect(events[5].event).to.equal('Refund');
      expect(events[5].args.to).to.equal(minter.address);
      expect(events[5].args.startTokenId).to.equal(2);
      expect(events[5].args.quantity).to.equal(5);
    });

    it('Still cannot mint 4', async () => {
      const minter = signers[2];
      const value = ethers.utils.parseEther('0.3');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 4, blockNumber);
      await expect(contract.connect(minter).mint(value, 4, blockNumber, signature, { value })).to.be.revertedWithCustomError(
        contract,
        'SoldOut'
      );
    });

    it('Can mint 3', async () => {
      const minter = signers[2];
      const value = ethers.utils.parseEther('0.3');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 3, blockNumber);
      const receipt = await (await contract.connect(minter).mint(value, 3, blockNumber, signature, { value })).wait();
      expect(receipt.events).to.have.lengthOf(3);
      const [first, second] = receipt.events;
      expect(first.event).to.equal('Transfer');
      expect(first.args.tokenId).to.equal(331);
      expect(second.event).to.equal('Transfer');
      expect(second.args.tokenId).to.equal(332);
    });

    it('User cannot update the supply', async () => {
      const user = signers[2];
      await expect(contract.connect(user).setSupply(1000)).to.be.revertedWith(
        InvalidRole(DEFAULT_ADMIN_ROLE, user.address)
      );
    });

    it('Admin can update the supply', async () => {
      await (await contract.setSupply(666)).wait();
    });

    it('Can mint 330 more', async () => {
      const minter = signers[2];
      const value = ethers.utils.parseEther('1');
      const blockNumber = await ethers.provider.getBlockNumber();
      const signature = await api.approveMint(minter.address, value, 330, blockNumber);
      const receipt = await (await contract.connect(minter).mint(value, 330, blockNumber, signature, { value })).wait();
      expect(receipt.events).to.have.lengthOf(330);
      const [first, second] = receipt.events;
      expect(first.event).to.equal('Transfer');
      expect(first.args.tokenId).to.equal(334);
      expect(second.event).to.equal('Transfer');
      expect(second.args.tokenId).to.equal(335);
    });
  });
});
