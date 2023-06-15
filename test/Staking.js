const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const {signVoucher, signMultiVoucher} = require('./utils/vouchers');
const {BigNumber} = require("ethers");

const name = 'NFT';
const version = '1';

describe('Staking', function () {
  let staking;
  let shard;
  let citizen;
  let signers;

  before(async () => {
    signers = await ethers.getSigners();
    const stakingFactory = await ethers.getContractFactory('MutariuumStaking');
    const shardFactory = await ethers.getContractFactory('BlackMarketShard')
    const citizenFactory = await ethers.getContractFactory('MutariuumCitizens')
    staking = await stakingFactory.deploy();
    await staking.deployed();
    shard = await shardFactory.deploy(signers[1].address, name, 'NFT', 'http://localhost/', 0, version);
    citizen = await citizenFactory.deploy(signers[1].address, name, 'NFT', 'http://localhost/', 0, version);
  });

  it('Mints 30 Black Shards', async () => {
    for (let i = 0; i < 30; i++) {
      const voucher = {
        tokenId: i,
        price: 0,
        buyer: signers[0].address,
        currBlockNumber: await ethers.provider.getBlockNumber(),
      }
      const signature = await signVoucher('NFT', '1', voucher, shard, signers[1]);
      const tx = await shard.redeem(voucher, signature);
      const receipt = await tx.wait();
      expect(receipt.events[0].args.tokenId).to.equal(i);
    }
  });

  it('Mints 60 Citizen', async () => {
    for (let i = 0; i < 30; i++) {
      const voucher = {
        buyer: signers[0].address,
        price: 0,
        amount: 2,
        tokens: [
          { nftId: 'yo' },
          { nftId: 'yo' }
        ],
        currBlockNumber: await ethers.provider.getBlockNumber(),
      }
      const signature = await signMultiVoucher('NFT', '1', voucher, citizen, signers[1]);
      const tx = await citizen.redeemMulti(voucher, signature);
      const receipt = await tx.wait();
      expect(receipt.events[0].args.tokenId).to.equal(i * 2);
    }
  });

  it('Send 5 wallets 1 black shard and 2 citizen', async () => {
    for (let i = 0; i < 5; i++) {
      const receiver = signers[2 + i];
      await shard.transferFrom(signers[0].address, receiver.address, i);
      await citizen.transferFrom(signers[0].address, receiver.address, i * 2);
      await citizen.transferFrom(signers[0].address, receiver.address, i * 2 + 1);

      const shardAsReceiver = shard.connect(receiver);
      const citizenAsReceiver = citizen.connect(receiver);
      await (await shardAsReceiver.setApprovalForAll(staking.address, true)).wait();
      await (await citizenAsReceiver.setApprovalForAll(staking.address, true)).wait();
    }
  });

  it('Stake fails', async () => {
    const receiver = signers[2];
    const stakingAsReceiver = staking.connect(receiver);
    await expect(
      stakingAsReceiver.stake(shard.address, [0])
    ).to.be.revertedWith('Staking is not active on this collection')
  });

  it('Enable staking', async () => {
    await (await staking.setStakingStatus(shard.address, true, true)).wait();
    await (await staking.setStakingStatus(citizen.address, true, true)).wait();
  });

  it('Stake all distributed', async () => {
    for (let i = 0; i < 5; i++) {
      const receiver = signers[2 + i];
      const stakingAsReceiver = staking.connect(receiver);
      {
        const receipt = await (await stakingAsReceiver.stake(shard.address, [i])).wait();
        const events = receipt.events.filter(e => e.event === 'Stake');
        expect(events).to.have.lengthOf(1);
        expect(await shard.ownerOf(i)).to.equal(staking.address);
      }
      {
        const receipt = await (await stakingAsReceiver.stake(citizen.address, [i * 2, i * 2 + 1])).wait();
        const events = receipt.events.filter(e => e.event === 'Stake');
        expect(events).to.have.lengthOf(2);
        expect(await citizen.ownerOf(i * 2)).to.equal(staking.address);
        expect(await citizen.ownerOf(i * 2 + 1)).to.equal(staking.address);
      }
    }
  });

  it('Unstake all distributed', async () => {
    for (let i = 0; i < 5; i++) {
      const receiver = signers[2 + i];
      const stakingAsReceiver = staking.connect(receiver);
      {
        const receipt = await (await stakingAsReceiver.unstake(shard.address, [i])).wait();
        const events = receipt.events.filter(e => e.event === 'Unstake');
        expect(events).to.have.lengthOf(1);
        expect(await shard.ownerOf(i)).to.equal(receiver.address);
      }
      {
        const receipt = await (await stakingAsReceiver.unstake(citizen.address, [i * 2, i * 2 + 1])).wait();
        const events = receipt.events.filter(e => e.event === 'Unstake');
        expect(events).to.have.lengthOf(2);
        expect(await citizen.ownerOf(i * 2)).to.equal(receiver.address);
        expect(await citizen.ownerOf(i * 2 + 1)).to.equal(receiver.address);
      }
    }
  });

  it('Correctly computes stake duration', async () => {
    await (await shard.setApprovalForAll(staking.address, true)).wait();
    const receipt = await (await staking.stake(shard.address, [5, 6, 7])).wait();
    const events = receipt.events.filter(e => e.event === 'Stake');
    expect(events).to.have.lengthOf(3);
    for (const event of events) {
      expect(event.args.contractAddress).to.equal(shard.address);
    }
    const five = await staking.stakingInfos(shard.address, 5);
    expect(five.owner).to.equal(signers[0].address);
    const six = await staking.stakingInfos(shard.address, 6);
    expect(six.owner).to.equal(signers[0].address);
    const seven = await staking.stakingInfos(shard.address, 7);
    expect(six.owner).to.equal(signers[0].address);
    const stakeTimes = [five.stakedAt, six.stakedAt, seven.stakedAt];

    await network.provider.request({
      method: 'evm_increaseTime',
      params: [3600 * 24 * 3],
    });
    const tx = await staking.unstake(shard.address, [5, 6, 7]);
    const blockTime = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
    const unstake = await tx.wait();
    const unstakes = unstake.events.filter(e => e.event === 'Unstake');
    expect(unstakes).to.have.lengthOf(3);
    for (const event of unstakes) {
      expect(event.args.contractAddress).to.equal(shard.address);
    }
    expect(BigNumber.from(blockTime).sub(stakeTimes[0])).to.equal(3600 * 24 * 3);
    expect(BigNumber.from(blockTime).sub(stakeTimes[1])).to.equal(3600 * 24 * 3);
    expect(BigNumber.from(blockTime).sub(stakeTimes[2])).to.equal(3600 * 24 * 3);
  });

  it('Cannot accidentally safeTransfer NFTs to the contract', async () => {
    await expect(
      citizen['safeTransferFrom(address,address,uint256)'](signers[0].address, staking.address, 15)
    ).to.be.revertedWithCustomError(
      citizen,
      'TransferToNonERC721ReceiverImplementer'
    );
    await expect(
      shard['safeTransferFrom(address,address,uint256)'](signers[0].address, staking.address, 15)
    ).to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer');
  });

  it('Can accidentally transfer NFTs to the contract', async () => {
    await (await citizen.transferFrom(signers[0].address, staking.address, 15)).wait();
    expect(await citizen.ownerOf(15)).to.equal(staking.address);
    const citizenInfo = await staking.stakingInfos(citizen.address, 15);
    expect(citizenInfo.owner).to.equal('0x0000000000000000000000000000000000000000');
    expect(citizenInfo.stakedAt).to.equal(0);

    await (await shard.transferFrom(signers[0].address, staking.address, 5)).wait();
    expect(await shard.ownerOf(5)).to.equal(staking.address);
    const shardInfo = await staking.stakingInfos(shard.address, 5);
    expect(shardInfo.owner).to.equal('0x0000000000000000000000000000000000000000');
    expect(shardInfo.stakedAt).to.equal(0);
  });

  it('Cannot unstake the tokens directly sent', async () => {
    await expect(staking.unstake(citizen.address, [15])).to.be.revertedWith(`You didn't stake this token`);
    await expect(staking.unstake(shard.address, [5])).to.be.revertedWith(`You didn't stake this token`);
  });

  it('Cannot recover stake without the right signature', async () => {
    const signer = signers[1];
    const signature = signer.signMessage(
      ethers.utils.arrayify(
        ethers.utils.soliditySha256(
          ['address', 'uint256', 'address', 'uint256'],
          [signers[0].address, 0, citizen.address, 15]
        )
      )
    );
    await expect(staking.recoverStake(citizen.address, 15, signature)).to.be.revertedWith(
      'This operation was not approved by the contract owner'
    );
  });

  it('Can recover citizen stake with the right signature', async () => {
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'address', 'uint256'],
      [signers[0].address, 0, citizen.address, 15]
    )
    const signature = await signers[0].signMessage(ethers.utils.arrayify(message));
    await (await staking.recoverStake(citizen.address, 15, signature)).wait()
    const citizenInfos = await staking.stakingInfos(citizen.address, 15);
    expect(citizenInfos.owner).to.equal(signers[0].address);
  });

  it('Can recover shard stake with the right signature', async () => {
    const message = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'address', 'uint256'],
      [signers[0].address, 1, shard.address, 5]
    );
    const signature = await signers[0].signMessage(ethers.utils.arrayify(message));
    await (await staking.recoverStake(shard.address, 5, signature)).wait()
    const shardInfos = await staking.stakingInfos(shard.address, 5);
    expect(shardInfos.owner).to.equal(signers[0].address);
  });

  it('Can unstake the tokens recovered', async () => {
    await (await staking.unstake(citizen.address, [15])).wait();
    await (await staking.unstake(shard.address, [5])).wait();

    expect(await shard.ownerOf(5)).to.equal(signers[0].address);
    expect(await citizen.ownerOf(15)).to.equal(signers[0].address);
  });

});
