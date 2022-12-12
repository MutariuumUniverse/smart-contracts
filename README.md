# Mutariuum Land NFT Contract

## Installation
```shell
yarn
```

### Running Tests

Make sure `NODE_ENV` in your `.env` file is set to `hardhat` (or `localhost` if you have a local node running). Then 
run:

```shell
yarn test
```

### Deploy

Edit `.env` file to set `NODE_ENV` to the name of the network you are deploying to. You may also need to put the 
deployer's and signer's (the address that approves mints from the back-end) private keys

```shell
yarn deploy
```
