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

let partners;
let team;
let initialHolders;
let holderShare;
let toLockForTeam;
let toLockForPartners;
let BP_CONVERTER = 1e4;

let oneDay = 3600 * 24;
let oneMonth = oneDay * 30;

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
        [ownerAcc, clientAcc1, clientAcc2, clientAcc3, clientAcc4, clientAcc5] =
            await ethers.getSigners();

        initialHolders = [
            clientAcc1.address,
            clientAcc2.address,
            clientAcc3.address,
        ];

        team = clientAcc4;
        partners = clientAcc5;

        // Deploy vesting
        let vestingFactory = await ethers.getContractFactory("Vesting");
        let vesting = await vestingFactory.deploy(
            initialHolders,
            team.address,
            partners.address
        );
        await vesting.deployed();

        // Deploy token
        let tokenFactory = await ethers.getContractFactory("Borroe");
        let token = await tokenFactory.deploy(
            vesting.address,
            liquidityPoolAddress,
            exchangeListingAddress,
            marketingAddress,
            treasuryAddress,
            rewardsAddress
        );
        await token.deployed();

        await vesting.setToken(token.address);

        let percentsToVest = (await token.totalSupply())
            .mul(await token.TO_VESTING())
            .div(await token.balanceOf(vesting.address));
        let toVest = (await token.balanceOf(vesting.address))
            .mul(percentsToVest)
            .div(BP_CONVERTER);
        holderShare = toVest.div(initialHolders.length);

        let percentsToLockForTeam = (await token.totalSupply())
            .mul(await token.TO_LOCK_TEAM())
            .div(await token.balanceOf(vesting.address));
        toLockForTeam = (await token.balanceOf(vesting.address))
            .mul(percentsToLockForTeam)
            .div(BP_CONVERTER);

        let percentsToLockForPartners = (await token.totalSupply())
            .mul(await token.TO_LOCK_PARTNERS())
            .div(await token.balanceOf(vesting.address));
        toLockForPartners = (await token.balanceOf(vesting.address))
            .mul(percentsToLockForPartners)
            .div(BP_CONVERTER);

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
                await expect(
                    newVestingFactory.deploy([], team.address, partners.address)
                ).to.be.revertedWith("Vesting: No initial holders");
            });
            it("Should fail to deploy if zero address team", async () => {
                let newVestingFactory = await ethers.getContractFactory(
                    "Vesting"
                );
                await expect(
                    newVestingFactory.deploy(
                        initialHolders,
                        zeroAddress,
                        partners.address
                    )
                ).to.be.revertedWith("Vesting: Invalid team address");
            });
            it("Should fail to deploy if zero address team", async () => {
                let newVestingFactory = await ethers.getContractFactory(
                    "Vesting"
                );
                await expect(
                    newVestingFactory.deploy(
                        initialHolders,
                        team.address,
                        zeroAddress
                    )
                ).to.be.revertedWith("Vesting: Invalid partners address");
            });
        });
    });

    describe("Modifiers", () => {
        describe("If not vested", () => {
            it("Should forbid vesting twice", async () => {
                let { vesting, token } = await loadFixture(deploys);

                await vesting.startInitialVestings();

                await expect(vesting.startInitialVestings()).to.be.revertedWith(
                    "Vesting: Initial vestings already started"
                );
            });
        });
    });

    describe("Getters", () => {
        describe("Get user's vesting", () => {
            it("Should get user's vesting", async () => {
                let { vesting, token } = await loadFixture(deploys);

                await vesting.startInitialVestings();

                let [
                    status1,
                    to1,
                    amount1,
                    amountClaimed1,
                    startTime1,
                    claimablePeriods1,
                    periodDuration1,
                    lastClaimedPeriod1,
                ] = await vesting.getUserVesting(clientAcc1.address);

                let [
                    status2,
                    to2,
                    amount2,
                    amountClaimed2,
                    startTime2,
                    claimablePeriods2,
                    periodDuration2,
                    lastClaimedPeriod2,
                ] = await vesting.getUserVesting(team.address);

                expect(status1).to.equal(0);
                expect(to1).to.equal(clientAcc1.address);
                expect(amount1).to.equal(holderShare);
                expect(amountClaimed1).to.equal(0);
                expect(claimablePeriods1).to.equal(3);
                expect(periodDuration1).to.equal(oneMonth);
                expect(lastClaimedPeriod1).to.equal(0);

                expect(status2).to.equal(0);
                expect(to2).to.equal(team.address);
                expect(amount2).to.equal(toLockForTeam);
                expect(amountClaimed2).to.equal(0);
                expect(claimablePeriods2).to.equal(1);
                expect(periodDuration2).to.equal(oneMonth * 24);
                expect(lastClaimedPeriod2).to.equal(0);
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

                expect(await vesting.vested()).to.equal(false);
                await expect(vesting.startInitialVestings()).to.emit(
                    vesting,
                    "VestingStarted"
                );
                expect(await vesting.vested()).to.equal(true);

                let [
                    status1,
                    to1,
                    amount1,
                    amountClaimed1,
                    startTime1,
                    claimablePeriods1,
                    periodDuration1,
                    lastClaimedPeriod1,
                ] = await vesting.getUserVesting(clientAcc1.address);

                expect(status1).to.equal(0);
                expect(to1).to.equal(clientAcc1.address);
                expect(amount1).to.equal(holderShare);
                expect(amountClaimed1).to.equal(0);
                expect(claimablePeriods1).to.equal(3);
                expect(periodDuration1).to.equal(oneMonth);
                expect(lastClaimedPeriod1).to.equal(0);

                let [
                    status2,
                    to2,
                    amount2,
                    amountClaimed2,
                    startTime2,
                    claimablePeriods2,
                    periodDuration2,
                    lastClaimedPeriod2,
                ] = await vesting.getUserVesting(clientAcc2.address);

                expect(status2).to.equal(0);
                expect(to2).to.equal(clientAcc2.address);
                expect(amount2).to.equal(holderShare);
                expect(amountClaimed2).to.equal(0);
                expect(periodDuration2).to.equal(oneMonth);
                expect(claimablePeriods2).to.equal(3);
                expect(lastClaimedPeriod2).to.equal(0);

                let [
                    status3,
                    to3,
                    amount3,
                    amountClaimed3,
                    startTime3,
                    claimablePeriods3,
                    periodDuration3,
                    lastClaimedPeriod3,
                ] = await vesting.getUserVesting(clientAcc3.address);

                expect(status3).to.equal(0);
                expect(to3).to.equal(clientAcc3.address);
                expect(amount3).to.equal(holderShare);
                expect(amountClaimed3).to.equal(0);
                expect(periodDuration3).to.equal(oneMonth);
                expect(claimablePeriods3).to.equal(3);
                expect(lastClaimedPeriod3).to.equal(0);

                let [
                    status4,
                    to4,
                    amount4,
                    amountClaimed4,
                    startTime4,
                    claimablePeriods4,
                    periodDuration4,
                    lastClaimedPeriod4,
                ] = await vesting.getUserVesting(team.address);

                expect(status4).to.equal(0);
                expect(to4).to.equal(team.address);
                expect(amount4).to.equal(toLockForTeam);
                expect(amountClaimed4).to.equal(0);
                expect(claimablePeriods4).to.equal(1);
                expect(periodDuration4).to.equal(oneMonth * 24);
                expect(lastClaimedPeriod4).to.equal(0);
            });

            describe("Fails", () => {
                it("Should fail to start vesting if token not set", async () => {
                    let newVestingFactory = await ethers.getContractFactory(
                        "Vesting"
                    );
                    let newVesting = await newVestingFactory.deploy(
                        initialHolders,
                        team.address,
                        partners.address
                    );
                    await newVesting.deployed();

                    let newTokenFactory = await ethers.getContractFactory(
                        "Borroe"
                    );
                    let newToken = await newTokenFactory.deploy(
                        newVesting.address,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        treasuryAddress,
                        rewardsAddress
                    );
                    await newToken.deployed();

                    await expect(
                        newVesting.startInitialVestings()
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
                        vesting.startInitialVestings()
                    ).to.be.revertedWith("Vesting: Insufficient balance");
                });
            });
        });
        describe("Claim tokens", () => {
            describe("Vesting", () => {
                describe("For one holder", () => {
                    describe("During first period", () => {
                        it("Should claim correct token amount", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let clientStartBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            // Wait 10 days
                            await time.increase(oneDay * 10);
                            await vesting.connect(clientAcc1).claimTokens();

                            let clientEndBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            expect(clientEndBalance1).to.equal(
                                clientStartBalance1
                            );

                            let [
                                status1,
                                to1,
                                amount1,
                                amountClaimed1,
                                startTime1,
                                claimablePeriods1,
                                periodDuration1,
                                lastClaimedPeriod1,
                            ] = await vesting.getUserVesting(
                                clientAcc1.address
                            );

                            expect(status1).to.equal(0);
                            expect(to1).to.equal(clientAcc1.address);
                            expect(amount1).to.equal(holderShare);
                            expect(amountClaimed1).to.equal(0);
                            expect(claimablePeriods1).to.equal(3);
                            expect(periodDuration1).to.equal(oneMonth);
                            expect(lastClaimedPeriod1).to.equal(0);
                        });
                    });
                    describe("After first period", () => {
                        it("Should claim correct token amount", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let clientStartBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            // Wait 30 days
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
                                periodDuration1,
                                lastClaimedPeriod1,
                            ] = await vesting.getUserVesting(
                                clientAcc1.address
                            );

                            expect(status1).to.equal(0);
                            expect(to1).to.equal(clientAcc1.address);
                            expect(amount1).to.equal(holderShare);
                            expect(amountClaimed1).to.equal(
                                holderSharePerMonth
                            );
                            expect(claimablePeriods1).to.equal(3);
                            expect(periodDuration1).to.equal(oneMonth);
                            expect(lastClaimedPeriod1).to.equal(1);
                        });
                        it("Should not claim the same period twice", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let clientStartBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            // Wait 30 days
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

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let clientStartBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            // Wait 90 days
                            await time.increase(oneDay * 90);
                            await vesting.connect(clientAcc1).claimTokens();

                            let clientEndBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            expect(clientEndBalance1).to.equal(
                                clientStartBalance1.add(
                                    holderSharePerMonth.mul(3)
                                )
                            );

                            let [
                                status1,
                                to1,
                                amount1,
                                amountClaimed1,
                                startTime1,
                                claimablePeriods1,
                                periodDuration1,
                                lastClaimedPeriod1,
                            ] = await vesting.getUserVesting(
                                clientAcc1.address
                            );

                            expect(status1).to.equal(1);
                            expect(to1).to.equal(clientAcc1.address);
                            expect(amount1).to.equal(holderShare);
                            expect(amountClaimed1).to.equal(
                                holderSharePerMonth.mul(3)
                            );
                            expect(claimablePeriods1).to.equal(3);
                            expect(periodDuration1).to.equal(oneMonth);
                            expect(lastClaimedPeriod1).to.equal(3);
                        });
                    });
                    describe("Long after all periods", () => {
                        it("Should claim correct token amount", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let clientStartBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            // Wait 365 days
                            await time.increase(oneDay * 365);
                            await vesting.connect(clientAcc1).claimTokens();

                            let clientEndBalance1 = await token.balanceOf(
                                clientAcc1.address
                            );

                            expect(clientEndBalance1).to.equal(
                                clientStartBalance1.add(
                                    holderSharePerMonth.mul(3)
                                )
                            );
                        });
                    });
                });
                describe("For all holders", () => {
                    describe("After all periods", () => {
                        it("Should claim correct token amount", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

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
                                clientStartBalance1.add(
                                    holderSharePerMonth.mul(3)
                                )
                            );
                            expect(clientEndBalance2).to.equal(
                                clientStartBalance2.add(
                                    holderSharePerMonth.mul(3)
                                )
                            );
                            expect(clientEndBalance3).to.equal(
                                clientStartBalance3.add(
                                    holderSharePerMonth.mul(3)
                                )
                            );
                        });
                    });
                });
            });
            describe("Locking", () => {
                describe("For all holders", () => {
                    describe("Before unlock time", () => {
                        it("Should not claim any tokens before unlock", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let teamStartBalance = await token.balanceOf(
                                team.address
                            );
                            let partnersStartBalance = await token.balanceOf(
                                partners.address
                            );

                            // Wait 6 months
                            await time.increase(oneMonth * 6);
                            await vesting.connect(team).claimTokens();
                            await vesting.connect(partners).claimTokens();

                            let teamEndBalance = await token.balanceOf(
                                team.address
                            );
                            let partnersEndBalance = await token.balanceOf(
                                partners.address
                            );

                            expect(teamEndBalance).to.equal(teamStartBalance);
                            expect(partnersEndBalance).to.equal(
                                partnersStartBalance
                            );

                            let [
                                status1,
                                to1,
                                amount1,
                                amountClaimed1,
                                startTime1,
                                claimablePeriods1,
                                periodDuration1,
                                lastClaimedPeriod1,
                            ] = await vesting.getUserVesting(team.address);

                            expect(status1).to.equal(0);
                            expect(to1).to.equal(team.address);
                            expect(amount1).to.equal(toLockForTeam);
                            expect(amountClaimed1).to.equal(0);
                            expect(claimablePeriods1).to.equal(1);
                            expect(periodDuration1).to.equal(oneMonth * 24);
                            expect(lastClaimedPeriod1).to.equal(0);

                            let [
                                status2,
                                to2,
                                amount2,
                                amountClaimed2,
                                startTime2,
                                claimablePeriods2,
                                periodDuration2,
                                lastClaimedPeriod2,
                            ] = await vesting.getUserVesting(partners.address);

                            expect(status2).to.equal(0);
                            expect(to2).to.equal(partners.address);
                            expect(amount2).to.equal(toLockForPartners);
                            expect(amountClaimed2).to.equal(0);
                            expect(claimablePeriods2).to.equal(1);
                            expect(periodDuration2).to.equal(oneMonth * 24);
                            expect(lastClaimedPeriod2).to.equal(0);
                        });
                    });
                    describe("After unlock time", () => {
                        it("Should claim correct token amount", async () => {
                            let { vesting, token } = await loadFixture(deploys);

                            await vesting.startInitialVestings();

                            let holderSharePerMonth = holderShare.div(3);

                            let teamStartBalance = await token.balanceOf(
                                team.address
                            );
                            let partnersStartBalance = await token.balanceOf(
                                partners.address
                            );

                            // Wait 24 months
                            await time.increase(oneMonth * 24);
                            await vesting.connect(team).claimTokens();
                            await vesting.connect(partners).claimTokens();

                            let teamEndBalance = await token.balanceOf(
                                team.address
                            );
                            let partnersEndBalance = await token.balanceOf(
                                partners.address
                            );

                            expect(teamEndBalance).to.equal(
                                teamStartBalance.add(toLockForTeam)
                            );
                            expect(partnersEndBalance).to.equal(
                                partnersStartBalance.add(toLockForPartners)
                            );

                            let [
                                status1,
                                to1,
                                amount1,
                                amountClaimed1,
                                startTime1,
                                claimablePeriods1,
                                periodDuration1,
                                lastClaimedPeriod1,
                            ] = await vesting.getUserVesting(team.address);

                            expect(status1).to.equal(1);
                            expect(to1).to.equal(team.address);
                            expect(amount1).to.equal(toLockForTeam);
                            expect(amountClaimed1).to.equal(toLockForTeam);
                            expect(claimablePeriods1).to.equal(1);
                            expect(periodDuration1).to.equal(oneMonth * 24);
                            expect(lastClaimedPeriod1).to.equal(1);

                            let [
                                status2,
                                to2,
                                amount2,
                                amountClaimed2,
                                startTime2,
                                claimablePeriods2,
                                periodDuration2,
                                lastClaimedPeriod2,
                            ] = await vesting.getUserVesting(partners.address);

                            expect(status2).to.equal(1);
                            expect(to2).to.equal(partners.address);
                            expect(amount2).to.equal(toLockForPartners);
                            expect(amountClaimed2).to.equal(toLockForPartners);
                            expect(claimablePeriods2).to.equal(1);
                            expect(periodDuration2).to.equal(oneMonth * 24);
                            expect(lastClaimedPeriod2).to.equal(1);
                        });
                    });
                });
            });
            describe("Fails", () => {
                it("Should fail to claim twice", async () => {
                    let { vesting, token } = await loadFixture(deploys);

                    await vesting.startInitialVestings();

                    // Wait 100 days
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
