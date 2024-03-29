require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-tracer");
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@primitivefi/hardhat-dodoc");
require("hardhat-deploy");

const { POLYGONSCAN_API_KEY, ACC_PRIVATE_KEY } = process.env;

module.exports = {
    solidity: {
        version: "0.8.17",
        settings: {
            optimizer: {
                enabled: true,
                runs: 10,
            },
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        polygon_mainnet: {
            url: `https://polygon-bor.publicnode.com`,
            accounts: [ACC_PRIVATE_KEY],
            gasPrice: 300000000000,
        },
        polygon_testnet: {
            url: `https://polygon-mumbai-bor.publicnode.com`,
            accounts: [ACC_PRIVATE_KEY],
            gasPrice: 35000000000,
        },
    },
    mocha: {
        timeout: 20000000000,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    skipFiles: ["node_modules"],
    gasReporter: {
        enabled: true,
        url: "http://localhost:8545",
    },
    dodoc: {
        exclude: ["mocks", "lin", "errors"],
        runOnCompile: false,
        freshOutput: true,
        outputDir: "./docs/contracts",
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: true,
        strict: true,
        runOnCompile: false,
    },
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
        },
    },
};
