const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  await ethers.provider.ready;

  const {
    link,
    coordinator,
    ticket,
    manager,
    nft,
    token
  } = await deployAll();
  const blockNumber = await ethers.provider.getBlockNumber();
  const lines = [
    'HTTP_PORT=9000',
    'PMA_PORT=9001',
    'REDIS_HOST=redis',
    'MARIADB_ROOT_PASSWORD=winnables',
    'MARIADB_HOST=db',
    'MARIADB_DATABASE=winnables',
    'MARIADB_USER=winnables',
    'MARIADB_PASSWORD=winnables',
    'UUID_NAMESPACE=50fbd16e-8ed2-450f-8536-07aaeaf7f599',
    '',
    'ETH_RPC=http://host.docker.internal:8545',
    'CHAIN_ID=31337',
    `LINK_ADDRESS=${link.address}`,
    `VRF_COORDINATOR=${coordinator.address}`,
    `WINNABLES_CONTRACT=${manager.address}`,
    `TICKET_CONTRACT=${ticket.address}`,
    `MOCK_NFT_CONTRACT=${nft.address}`,
    `MOCK_TOKEN_CONTRACT=${token.address}`,
    `CONTRACTS_DEPLOYED_AT=${blockNumber}`,
    `DEBUG=true`,
    ''
  ];
  const env = lines.join('\n');
  await fs.promises.writeFile(path.join(__dirname, '..', '..', '.env'), env);
  console.log('.env: \n\n' + lines.join('\n'));

  manager.on('RequestSent', async (requestId, raffleId) => {
    console.log('Requested Random number', { requestId, raffleId });
    coordinator.fulfillRandomWordsWithOverride(
      requestId,
      manager.address,
      randomWord()
    );
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
