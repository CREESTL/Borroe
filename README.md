# Borroe Project Smart Contracts

#### Table of Contents

[Prereqiusites](#preqs)  
[Build](#build)  
[Test](#tests)  
[Run Scripts](#run)  
[Deploy](#deploy)  
[Networks](#networks)  
[Wallets](#wallets)  
[Structure of Deploy Output File](#output)  
[Logic](#logic)  
[[Known Issues]](#issues)

<a name="preqs">

## Prerequisites

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/download/)
- Clone this repository
- Navigate to the directory with the cloned code
- Install Hardhat with `npm install --save-dev hardhat`
- Install all required dependencies with `npm install`
- Create a file called `.env` in the root of the project with the same contents as `.env.example`
- Place your secret API keys, private keys, etc. to the `.env` file

  :warning:**DO NOT SHARE YOUR .env FILE IN ANY WAY OR YOU RISK TO LOSE ALL YOUR FUNDS**:warning:

<a name="build"/>

## Build

```
npx hardhat compile
```

<a name="tests"/>

## Test

```
npx hardhat test --network hardhat
```

<a name="run"/>

## Run Scripts

```
npx hardhat run <script file name here> --network <network name here>
```

<a name="deploy"/>

## Deploy

```
npx hardhat run scripts/deploy.js --network <network name here>
```

Deployment script takes about 5 minutes to complete. Please, be patient!  
After the contracts get deployed you can find their _addresses_ and code verification _URLs_ in the `scripts/deployOutput.json` file (see [Structure of Deploy Output File](#output)).  
Note that this file only refreshes the addresses of contracts that have been successfully deployed (or redeployed). If you deploy only a single contract then its address would get updated and all other addresses would remain untouched and would link to _old_ contracts.  
Please, **do not** write anything to `deployOutput.json` file yourself! It is a read-only file.  
All deployed contracts _are verified_ on Polygonscan.

<a name="networks"/>

## Networks

а) **Test** network  
Make sure you have _enough test tokens_ for testnet.

```
npx hardhat run <script name here> --network polygon_testnet
```

b) **Main** network  
Make sure you have _enough real tokens_ in your wallet. Deployment to the mainnet costs money!

```
npx hardhat run <script name here> --network polygon_mainnet
```

c) **Local** network

- Run Hardhat node locally:

```
npx hardhat node
```

- Run sripts on the node

```
npx hardhat run <script name here> --network localhost
```

<a name="wallets"/>

## Wallets

For deployment you will need to use either _your existing wallet_ or _a generated one_.

### Using an Existing Wallet

If you choose to use your existing wallet, then you will need to be able to export (copy/paste) its private key. For example, you can export private key from your MetaMask wallet.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

### Creating a New Wallet

If you choose to create a fresh wallet for this project, you should use `createWallet` script from `scripts/` directory.

```
node scripts/createWallet.js
```

This will generate a single new wallet and show its address and private key. **Save** them somewhere else!
A new wallet _does not_ hold any tokens. You have to provide it with tokens of your choice.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

<a name="output"/>

## Structure of Deploy Output File

This file contains the result of contracts deployment.

It is separated in 2 parts. Each of them represents deployment to testnet or mainnet.  
Each part contains information about all deployed contracts:

- The address of the contract (`address`)
- The URL for Polygonscan page with verified code of the contract (`verification`)

<a name="logic"/>

## Logic

#### BORROE Token

Name: BORRROE  
Symbol: $ROE  
Decimals: 18    
Supply: 1 000 000 000  

This is an ERC20 token with *premint* and custom transfer *fees*.  
After token gets deployed, the following distribution happens:  
- 57.5% of token supply move to Vesting contract
- 10% of token supply move to Luquidity Pool 
- 10% of token supply move to Exchange Listing wallet
- 10% of token supply move to Marketing wallet
- 10% of token supply move to Treasury
- 2.5% of token supply move to Rewards wallet

Token has a *whitelist* functionality implemented. When `N` tokens get transferred to an address from the whitelist, 3% of `N` get withdrawn as fees.
The withdrawn amount is distibuted as follows:
- 1% is burnt
- 1% moves to Marketing wallet
- 1% moves to Rewards wallet

The intention is to add DEXes addresses to the whitelist. Thus, when creating orders on DEXes, users will pay fees (3% of order amount).  
If tokens are transferred to any address not from the whitelist (for example, one user sends tokens to his friend), *no fees are withdrawn*

#### Vesting

This contract implements 2 types of vestings:
1. 3-months vesting for the predetermined list of initial holders
2. 24-months vesting for Team and Partners wallers (a.k.a *Locking*)

After BORROE token gets deployed, 57.5% of token supply move to Vesting contract. 
- 50% are distributed in 3-months vesting among initial holders
- 5% are locked for 24 months for Team wallet
- 2.5% are locked for 24 months for Partners wallet

Initial holders take part in a linear vesting. That is, each month every holder can claim 1/3 of his total share of vested tokens.
Team and Partners wallets can claim their total shares after 24 months since vesting has begun. They cannot claim tokens in portions like in a linear vesting.

---

<a name="issues"/>

**[Known Issues]**

### Order of Deployment  
Contracts should be deployed in the following order:  
- Vesting  
- Token  

After that, a `setToken` function of Vesting contract should be called with the address of the deployed token as a parameter. Without this step, it would be impossible to start vesting.  
This step is already done in `scripts/deploy.js` script.  
