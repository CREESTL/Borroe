const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { mean } = require("mathjs");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

let randomAddress = "0xB2dD091EA6e591D62f565D7a18ce2a7640ADd227";

let vestingAddress = randomAddress;
let lockAddress = randomAddress;
let liquidityPoolAddress = randomAddress;
let exchangeListingAddress = randomAddress;
let marketingAddress = randomAddress;
let treasuryAddress = randomAddress;
let rewardsAddress = randomAddress;

describe("BORROE token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        // Deploy token
        let tokenFactory = await ethers.getContractFactory("BORROE");
        let token = await tokenFactory.deploy(
            vestingAddress,
            lockAddress,
            liquidityPoolAddress,
            exchangeListingAddress,
            marketingAddress,
            treasuryAddress,
            rewardsAddress
        );
        await token.deployed();


        return {
            token,
        };
    }

    describe("Deployment", () => {

        it("Should have a correct total supply", async () => {
            let { token } = await loadFixture(deploys);
            // All of tokens should be minted
            let expectedTotalSupply = await token.maxTotalSupply();
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);
        });

    });

    describe("Modifiers", () => {
    });

    describe("Getters", () => {
    });

    describe("Main functions", () => {
    });
});
