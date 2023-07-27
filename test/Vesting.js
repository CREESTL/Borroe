const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-network-helpers");
const { mean } = require("mathjs");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

// Just random address from Polygonscan
let lockAddress = "0xb9EDE6f94D192073D8eaF85f8db677133d483249";
let liquidityPoolAddress = "0x66d6D429080722397E274695Bb90e9f0c07f584B";
let exchangeListingAddress = "0xCcBd9F738d5a17989DB6b4e414DB72aba5128F58";
let marketingAddress = "0xfDefD8489B79b5b81A7901B6B9aCf7730F4AdA07";
let treasuryAddress = "0xEED7870BBbb6aCE5C38b3CC8b23Eee2a6aCBC7aF";
let rewardsAddress = "0xAcf91E19290191Fc051Ca9E2181b980EE3fBF2aF";

let percentsToVesting = 5000;
let percentsToLock = 750;
let percentsToLiquidityPool = 1000;
let percentsToExchangeListing = 1000;
let percentsToMarketing = 1000;
let percentsToTreasury = 1000;
let percentsToRewards = 250;

let BP_CONVERTER = 1e4;

let initialHolders;

// Impersonate vesting contract and send some native tokens to it.
// Then transfer minted BORROE tokens from vesting to owner
async function fundOwner(token, transferAmount) {
    // Transfer native tokens from owner to vesting for gas
    let tx = {
        from: ownerAcc.address,
        to: vestingAddress,
        value: ethers.utils.parseEther("3"),
        nonce: ethers.provider.getTransactionCount(ownerAcc.address, "latest"),
        gasLimit: ethers.utils.hexlify("0x100000"),
        gasPrice: ethers.provider.getGasPrice(),
    };
    await ownerAcc.sendTransaction(tx);

    // Transfer BORROE tokens from vesting to owner
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [vestingAddress],
    });
    let vesting = await ethers.getSigner(vestingAddress);

    await token.connect(vesting).transfer(ownerAcc.address, transferAmount);
}

describe("Vesting", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2, clientAcc3] =
            await ethers.getSigners();

        initialHolders = [
            clientAcc1.address,
            clientAcc2.address,
            clientAcc3.address,
        ];

        // Deploy vesting
        let vestingFactory = await ethers.getContractFactory("Vesting");
        let vesting = await vestingFactory.deploy(initialHolders);
        await vesting.deployed();

        // Deploy token
        let tokenFactory = await ethers.getContractFactory("BORROE");
        let token = await tokenFactory.deploy(
            vesting.address,
            lockAddress,
            liquidityPoolAddress,
            exchangeListingAddress,
            marketingAddress,
            treasuryAddress,
            rewardsAddress
        );
        await token.deployed();

        await vesting.setToken(token.address);

        return {
            vesting,
            token,
        };
    }

    describe("Deployment", () => {
        it("Should deploy and have correct initial values", async () => {
            let { vesting, token } = await loadFixture(deploys);

            expect(await vesting.borroe()).to.equal(token.address);
            expect(await vesting.vested()).to.equal(false);
        });
        describe("Fails", () => {
            it("Should fail to deploy if no holders", async () => {
                let newVestingFactory = await ethers.getContractFactory(
                    "Vesting"
                );
                await expect(newVestingFactory.deploy([])).to.be.revertedWith(
                    "Vesting: No initial holders"
                );
            });
        });
    });

    describe("Modifiers", () => {
        describe("If not vested", () => {
            it("Should forbid vesting twice", async () => {
                let { vesting, token } = await loadFixture(deploys);

                await vesting.startInitialVestings(initialHolders);

                await expect(
                    vesting.startInitialVestings(initialHolders)
                ).to.be.revertedWith(
                    "Vesting: Initial vestings already started"
                );
            });
        });
    });

    describe("Getters", () => {
        describe("Get user's vesting", () => {
            it("Should get user's vesting", async () => {
                let { vesting, token } = await loadFixture(deploys);

                await vesting.startInitialVestings(initialHolders);

                let [
                    status,
                    to,
                    amount,
                    amountClaimed,
                    startTime,
                    claimablePeriods,
                    lastClaimedPeriod,
                ] = await vesting.getUserVesting(clientAcc1.address);

                let expectedAmount = (
                    await token.balanceOf(vesting.address)
                ).div(initialHolders.length);

                expect(status).to.equal(0);
                expect(to).to.equal(clientAcc1.address);
                expect(amount).to.equal(expectedAmount);
                expect(amountClaimed).to.equal(0);
                expect(claimablePeriods).to.equal(3);
                expect(lastClaimedPeriod).to.equal(0);
            });

            describe("Fails", () => {
                it("Should fail to get vesting of zero address user", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await expect(
                        vesting.getUserVesting(zeroAddress)
                    ).to.be.revertedWith("Vesting: Invalid user address");
                });
                it("Should fail to get vesting if vestings not started", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await expect(
                        vesting.getUserVesting(clientAcc1.address)
                    ).to.be.revertedWith("Vesting: Vestings not started");
                });
            });
        });
    });

    describe("Setters", () => {
        describe("Set token", () => {
            it("Should set new BORROE token", async () => {
                let { vesting, token } = await loadFixture(deploys);

                let oldToken = await vesting.borroe();

                await expect(vesting.setToken(clientAcc1.address)).to.emit(
                    vesting,
                    "TokenChanged"
                );

                let newToken = await vesting.borroe();

                expect(newToken).to.equal(clientAcc1.address);
                expect(newToken).not.to.equal(oldToken);
            });

            describe("Fails", () => {
                it("Should fail to set zero address token", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await expect(
                        vesting.setToken(zeroAddress)
                    ).to.be.revertedWith("Vesting: Invalid token address");
                });
                it("Should fail to set the same token address", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await expect(
                        vesting.setToken(token.address)
                    ).to.be.revertedWith("Vesting: Same token");
                });
            });
        });
    });

    describe("Main functions", () => {
        describe("Start vestings", () => {
            it("Should start vestings for all holders", async () => {
                let { vesting, token } = await loadFixture(deploys);

                let holderShare = (await token.balanceOf(vesting.address)).div(
                    initialHolders.length
                );

                expect(await vesting.vested()).to.equal(false);
                await expect(
                    vesting.startInitialVestings(initialHolders)
                ).to.emit(vesting, "VestingStarted");
                expect(await vesting.vested()).to.equal(true);

                let [
                    status1,
                    to1,
                    amount1,
                    amountClaimed1,
                    startTime1,
                    claimablePeriods1,
                    lastClaimedPeriod1,
                ] = await vesting.getUserVesting(clientAcc1.address);

                expect(status1).to.equal(0);
                expect(to1).to.equal(clientAcc1.address);
                expect(amount1).to.equal(holderShare);
                expect(amountClaimed1).to.equal(0);
                expect(claimablePeriods1).to.equal(3);
                expect(lastClaimedPeriod1).to.equal(0);

                let [
                    status2,
                    to2,
                    amount2,
                    amountClaimed2,
                    startTime2,
                    claimablePeriods2,
                    lastClaimedPeriod2,
                ] = await vesting.getUserVesting(clientAcc2.address);

                expect(status2).to.equal(0);
                expect(to2).to.equal(clientAcc2.address);
                expect(amount2).to.equal(holderShare);
                expect(amountClaimed2).to.equal(0);
                expect(claimablePeriods2).to.equal(3);
                expect(lastClaimedPeriod2).to.equal(0);

                let [
                    status3,
                    to3,
                    amount3,
                    amountClaimed3,
                    startTime3,
                    claimablePeriods3,
                    lastClaimedPeriod3,
                ] = await vesting.getUserVesting(clientAcc3.address);

                expect(status3).to.equal(0);
                expect(to3).to.equal(clientAcc3.address);
                expect(amount3).to.equal(holderShare);
                expect(amountClaimed3).to.equal(0);
                expect(claimablePeriods3).to.equal(3);
                expect(lastClaimedPeriod3).to.equal(0);
            });

            describe("Fails", () => {
                it("Should fail to start vesting if token not set", async () => {
                    let newVestingFactory = await ethers.getContractFactory(
                        "Vesting"
                    );
                    let newVesting = await newVestingFactory.deploy(
                        initialHolders
                    );
                    await newVesting.deployed();

                    let newTokenFactory = await ethers.getContractFactory(
                        "BORROE"
                    );
                    let newToken = await newTokenFactory.deploy(
                        newVesting.address,
                        lockAddress,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        treasuryAddress,
                        rewardsAddress
                    );
                    await newToken.deployed();

                    await expect(
                        newVesting.startInitialVestings(initialHolders)
                    ).to.be.revertedWith("Vesting: Invalid token address");
                });
                it("Should fail to start vesting if zero balance", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    let mockFactory = await ethers.getContractFactory(
                        "MockERC20"
                    );
                    let mockToken = await mockFactory.deploy();
                    await mockToken.deployed();

                    await vesting.setToken(mockToken.address);

                    await expect(
                        vesting.startInitialVestings(initialHolders)
                    ).to.be.revertedWith("Vesting: Insufficient balance");
                });
            });
        });
        describe("Claim tokens", () => {
            describe("For one holder", () => {
                describe("During first period", () => {
                    it("Should claim correct token amount", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        // Wait 10 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 10);
                        await vesting.connect(clientAcc1).claimTokens();

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        expect(clientEndBalance1).to.equal(clientStartBalance1);

                        let [
                            status1,
                            to1,
                            amount1,
                            amountClaimed1,
                            startTime1,
                            claimablePeriods1,
                            lastClaimedPeriod1,
                        ] = await vesting.getUserVesting(clientAcc1.address);

                        expect(status1).to.equal(0);
                        expect(to1).to.equal(clientAcc1.address);
                        expect(amount1).to.equal(holderShare);
                        expect(amountClaimed1).to.equal(0);
                        expect(claimablePeriods1).to.equal(3);
                        expect(lastClaimedPeriod1).to.equal(0);
                    });
                });
                describe("After first period", () => {
                    it("Should claim correct token amount", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        // Wait 30 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 30);
                        await expect(
                            vesting.connect(clientAcc1).claimTokens()
                        ).to.emit(vesting, "VestingClaimed");

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        expect(clientEndBalance1).to.equal(
                            clientStartBalance1.add(holderSharePerMonth)
                        );

                        let [
                            status1,
                            to1,
                            amount1,
                            amountClaimed1,
                            startTime1,
                            claimablePeriods1,
                            lastClaimedPeriod1,
                        ] = await vesting.getUserVesting(clientAcc1.address);

                        expect(status1).to.equal(0);
                        expect(to1).to.equal(clientAcc1.address);
                        expect(amount1).to.equal(holderShare);
                        expect(amountClaimed1).to.equal(holderSharePerMonth);
                        expect(claimablePeriods1).to.equal(3);
                        expect(lastClaimedPeriod1).to.equal(1);
                    });
                    it("Should not claim the same period twice", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        // Wait 30 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 30);
                        await expect(
                            vesting.connect(clientAcc1).claimTokens()
                        ).to.emit(vesting, "VestingClaimed");
                        await vesting.connect(clientAcc1).claimTokens();

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        expect(clientEndBalance1).to.equal(
                            clientStartBalance1.add(holderSharePerMonth)
                        );
                    });
                });
                describe("After all periods", () => {
                    it("Should claim correct token amount", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        // Wait 90 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 90);
                        await vesting.connect(clientAcc1).claimTokens();

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        expect(clientEndBalance1).to.equal(
                            clientStartBalance1.add(holderSharePerMonth.mul(3))
                        );

                        let [
                            status1,
                            to1,
                            amount1,
                            amountClaimed1,
                            startTime1,
                            claimablePeriods1,
                            lastClaimedPeriod1,
                        ] = await vesting.getUserVesting(clientAcc1.address);

                        expect(status1).to.equal(1);
                        expect(to1).to.equal(clientAcc1.address);
                        expect(amount1).to.equal(holderShare);
                        expect(amountClaimed1).to.equal(
                            holderSharePerMonth.mul(3)
                        );
                        expect(claimablePeriods1).to.equal(3);
                        expect(lastClaimedPeriod1).to.equal(3);
                    });
                });
                describe("Long after all periods", () => {
                    it("Should claim correct token amount", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        // Wait 365 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 365);
                        await vesting.connect(clientAcc1).claimTokens();

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );

                        expect(clientEndBalance1).to.equal(
                            clientStartBalance1.add(holderSharePerMonth.mul(3))
                        );
                    });
                });
            });
            describe("For all holders", () => {
                describe("After all periods", () => {
                    it("Should claim correct token amount", async () => {
                        let { vesting, token } = await loadFixture(deploys);

                        await vesting.startInitialVestings(initialHolders);

                        let holderShare = (
                            await token.balanceOf(vesting.address)
                        ).div(initialHolders.length);
                        let holderSharePerMonth = holderShare.div(3);

                        let clientStartBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );
                        let clientStartBalance2 = await token.balanceOf(
                            clientAcc2.address
                        );
                        let clientStartBalance3 = await token.balanceOf(
                            clientAcc3.address
                        );

                        // Wait 365 days
                        let oneDay = 3600 * 24;
                        await time.increase(oneDay * 365);
                        await vesting.connect(clientAcc1).claimTokens();
                        await vesting.connect(clientAcc2).claimTokens();
                        await vesting.connect(clientAcc3).claimTokens();

                        let clientEndBalance1 = await token.balanceOf(
                            clientAcc1.address
                        );
                        let clientEndBalance2 = await token.balanceOf(
                            clientAcc2.address
                        );
                        let clientEndBalance3 = await token.balanceOf(
                            clientAcc3.address
                        );

                        expect(clientEndBalance1).to.equal(
                            clientStartBalance1.add(holderSharePerMonth.mul(3))
                        );
                        expect(clientEndBalance2).to.equal(
                            clientStartBalance2.add(holderSharePerMonth.mul(3))
                        );
                        expect(clientEndBalance3).to.equal(
                            clientStartBalance3.add(holderSharePerMonth.mul(3))
                        );
                    });
                });
            });
            describe("Fails", () => {
                it("Should fail to claim twice", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await vesting.startInitialVestings(initialHolders);

                    // Wait 100 days
                    let oneDay = 3600 * 24;
                    await time.increase(oneDay * 100);
                    await vesting.connect(clientAcc1).claimTokens();

                    await expect(
                        vesting.connect(clientAcc1).claimTokens()
                    ).to.be.revertedWith("Vesting: Vesting already claimed");
                });
            });
        });
    });
});
