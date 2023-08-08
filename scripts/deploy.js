const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

const liquidityPoolAddress = process.env.LIQUIDITY_POOL_ADDRESS;
const exchangeListingAddress = process.env.EXCHANGE_LISTING_ADDRESS;
const marketingAddress = process.env.MARKETING_ADDRESS;
const treasuryAddress = process.env.TREASURY_ADDRESS;
const rewardsAddress = process.env.REWARDS_ADDRESS;
const teamAddress = process.env.TEAM_ADDRESS;
const partnersAddress = process.env.PARTNERS_ADDRESS;

let contractName;
let token;
let vesting;

async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

    // ====================================================

    // Contract #1: Vesting

    contractName = "Vesting";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    contractDeployTx = await _contractProto.deploy(
        teamAddress,
        partnersAddress
    );
    vesting = await contractDeployTx.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = vesting.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "polygon_mainnet") {
        url = "https://polygonscan.com/address/" + vesting.address + "#code";
    } else if (network.name === "polygon_testnet") {
        url =
            "https://mumbai.polygonscan.com/address/" +
            vesting.address +
            "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: vesting.address,
            constructorArguments: [teamAddress, partnersAddress],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #2: BORROE token
    contractName = "Borroe";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    contractDeployTx = await _contractProto.deploy(
        vesting.address,
        liquidityPoolAddress,
        exchangeListingAddress,
        marketingAddress,
        treasuryAddress,
        rewardsAddress
    );
    token = await contractDeployTx.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = token.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "polygon_mainnet") {
        url = "https://polygonscan.com/address/" + token.address + "#code";
    } else if (network.name === "polygon_testnet") {
        url =
            "https://mumbai.polygonscan.com/address/" + token.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: token.address,
            constructorArguments: [
                vesting.address,
                liquidityPoolAddress,
                exchangeListingAddress,
                marketingAddress,
                treasuryAddress,
                rewardsAddress,
            ],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Add token address
    console.log("Setting BORROE token address for vesting...");
    tx = await vesting.setToken(token.address);
    await tx.wait();
    console.log("BORROE token set!");

    // ====================================================

    fs.writeFileSync(
        path.resolve(__dirname, fileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Deployment and verification are completed!***\n***See Results in "${
            __dirname + fileName
        }" file***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
