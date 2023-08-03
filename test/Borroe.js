const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { mean } = require("mathjs");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

// Just random address from Polygonscan
let vestingAddress = "0xB2dD091EA6e591D62f565D7a18ce2a7640ADd227";
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

describe("BORROE token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        // Deploy token
        let tokenFactory = await ethers.getContractFactory("Borroe");
        let token = await tokenFactory.deploy(
            vestingAddress,
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
        it("Should have a correct name", async () => {
            let { token } = await loadFixture(deploys);
            expect(await token.name()).to.equal("BORROE");
        });
        it("Should have a correct symbol", async () => {
            let { token } = await loadFixture(deploys);
            expect(await token.symbol()).to.equal("$ROE");
        });
        it("Should have correct decimals", async () => {
            let { token } = await loadFixture(deploys);
            expect(await token.decimals()).to.equal(18);
        });
        it("Should have a correct total supply", async () => {
            let { token } = await loadFixture(deploys);
            // All of tokens should be minted
            let expectedTotalSupply = await token.maxTotalSupply();
            expect(await token.totalSupply()).to.equal(expectedTotalSupply);

            // Checks balances of all addresses where tokens should have
            // been preminted
            let expectedToVesting = expectedTotalSupply
                .mul(percentsToVesting + percentsToLock)
                .div(BP_CONVERTER);
            let expectedToLiquidityPool = expectedTotalSupply
                .mul(percentsToLiquidityPool)
                .div(BP_CONVERTER);
            let expectedToExchangeListing = expectedTotalSupply
                .mul(percentsToExchangeListing)
                .div(BP_CONVERTER);
            let expectedToMarketing = expectedTotalSupply
                .mul(percentsToMarketing)
                .div(BP_CONVERTER);
            let expectedToTreasury = expectedTotalSupply
                .mul(percentsToTreasury)
                .div(BP_CONVERTER);
            let expectedToRewards = expectedTotalSupply
                .mul(percentsToRewards)
                .div(BP_CONVERTER);

            expect(await token.balanceOf(vestingAddress)).to.equal(
                expectedToVesting
            );
            expect(await token.balanceOf(liquidityPoolAddress)).to.equal(
                expectedToLiquidityPool
            );
            expect(await token.balanceOf(exchangeListingAddress)).to.equal(
                expectedToExchangeListing
            );
            expect(await token.balanceOf(marketingAddress)).to.equal(
                expectedToMarketing
            );
            expect(await token.balanceOf(treasuryAddress)).to.equal(
                expectedToTreasury
            );
            expect(await token.balanceOf(rewardsAddress)).to.equal(
                expectedToRewards
            );
        });

        describe("Fails", () => {
            it("Should fail to deploy with zero vesting address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        zeroAddress,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        treasuryAddress,
                        rewardsAddress
                    )
                ).to.be.revertedWith("BORROE: Invalid vesting address");
            });
            it("Should fail to deploy with zero liquidity pool address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        vestingAddress,
                        zeroAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        treasuryAddress,
                        rewardsAddress
                    )
                ).to.be.revertedWith("BORROE: Invalid liquidity pool address");
            });
            it("Should fail to deploy with zero exchange listing address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        vestingAddress,
                        liquidityPoolAddress,
                        zeroAddress,
                        marketingAddress,
                        treasuryAddress,
                        rewardsAddress
                    )
                ).to.be.revertedWith(
                    "BORROE: Invalid exchange listing address"
                );
            });
            it("Should fail to deploy with zero marketing address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        vestingAddress,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        zeroAddress,
                        treasuryAddress,
                        rewardsAddress
                    )
                ).to.be.revertedWith("BORROE: Invalid marketing address");
            });
            it("Should fail to deploy with zero treasury address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        vestingAddress,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        zeroAddress,
                        rewardsAddress
                    )
                ).to.be.revertedWith("BORROE: Invalid treasury address");
            });
            it("Should fail to deploy with zero rewards address", async () => {
                let newTokenFactory = await ethers.getContractFactory("Borroe");
                await expect(
                    newTokenFactory.deploy(
                        vestingAddress,
                        liquidityPoolAddress,
                        exchangeListingAddress,
                        marketingAddress,
                        rewardsAddress,
                        zeroAddress
                    )
                ).to.be.revertedWith("BORROE: Invalid rewards address");
            });
        });
    });

    describe("Modifiers", () => {
        describe("Only owner", () => {
            it("Should allow only owner to call some functions", async () => {
                let { token } = await loadFixture(deploys);
                await expect(
                    token.connect(clientAcc1).addToWhitelist(clientAcc2.address)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Getters", () => {
        describe("Max total supply", () => {
            it("Should get correct max total supply", async () => {
                let { token } = await loadFixture(deploys);
                let expectedMaxTokenSupply = parseEther("1000000000");
                expect(await token.maxTotalSupply()).to.equal(
                    expectedMaxTokenSupply
                );
            });
        });
        describe("Whitelist", () => {
            it("Should check if user is whitelisted", async () => {
                let { token } = await loadFixture(deploys);
                expect(
                    await token.checkWhitelisted(clientAcc1.address)
                ).to.equal(false);
                await token.addToWhitelist(clientAcc1.address);
                expect(
                    await token.checkWhitelisted(clientAcc1.address)
                ).to.equal(true);
            });
            describe("Fails", () => {
                it("Should fail to check whitelisted for zero address", async () => {
                    let { token } = await loadFixture(deploys);
                    await expect(
                        token.checkWhitelisted(zeroAddress)
                    ).to.be.revertedWith("BORROE: Invalid address");
                });
            });
        });
    });

    describe("Main functions", () => {
        describe("Whitelist", () => {
            describe("Add to whitelist", () => {
                it("Add new user to whitelist", async () => {
                    let { token } = await loadFixture(deploys);
                    expect(
                        await token.checkWhitelisted(clientAcc1.address)
                    ).to.equal(false);
                    await expect(
                        token.addToWhitelist(clientAcc1.address)
                    ).to.emit(token, "AddedToWhitelist");
                    expect(
                        await token.checkWhitelisted(clientAcc1.address)
                    ).to.equal(true);
                });
                describe("Fails", () => {
                    it("Should fail to add zero address user to whitelist", async () => {
                        let { token } = await loadFixture(deploys);
                        await expect(
                            token.addToWhitelist(zeroAddress)
                        ).to.be.revertedWith("BORROE: Invalid address");
                    });
                    it("Should fail to add already whitelisted user", async () => {
                        let { token } = await loadFixture(deploys);
                        await token.addToWhitelist(clientAcc1.address);
                        await expect(
                            token.addToWhitelist(clientAcc1.address)
                        ).to.be.revertedWith(
                            "BORROE: Address is already whitelisted"
                        );
                    });
                });
            });
            describe("Remove from whitelist", () => {
                it("Remove user from whitelist", async () => {
                    let { token } = await loadFixture(deploys);
                    expect(
                        await token.checkWhitelisted(clientAcc1.address)
                    ).to.equal(false);
                    await token.addToWhitelist(clientAcc1.address);
                    expect(
                        await token.checkWhitelisted(clientAcc1.address)
                    ).to.equal(true);
                    expect(
                        token.removeFromWhitelist(clientAcc1.address)
                    ).to.emit(token, "RemovedFromWhitelist");
                    expect(
                        await token.checkWhitelisted(clientAcc1.address)
                    ).to.equal(false);
                });
                describe("Fails", () => {
                    it("Should fail to remove zero address user from whitelist", async () => {
                        let { token } = await loadFixture(deploys);
                        await expect(
                            token.removeFromWhitelist(zeroAddress)
                        ).to.be.revertedWith("BORROE: Invalid address");
                    });
                    it("Should fail to remove not whitelisted user", async () => {
                        let { token } = await loadFixture(deploys);
                        await expect(
                            token.removeFromWhitelist(clientAcc1.address)
                        ).to.be.revertedWith(
                            "BORROE: Address is not whitelisted"
                        );
                    });
                });
            });
        });
        describe("Transfer", () => {
            describe("Without fee", () => {
                it("Should transfer tokens to destination", async () => {
                    let { token } = await loadFixture(deploys);
                    let transferAmount = parseEther("2");

                    await fundOwner(token, transferAmount);

                    let ownerStartBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientStartBalance = await token.balanceOf(
                        clientAcc1.address
                    );
                    await token.transfer(clientAcc1.address, transferAmount);
                    let ownerEndBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientEndBalance = await token.balanceOf(
                        clientAcc1.address
                    );

                    expect(ownerEndBalance).to.equal(
                        ownerStartBalance.sub(transferAmount)
                    );
                    expect(clientEndBalance).to.equal(
                        clientStartBalance.add(transferAmount)
                    );
                });
            });
            describe("With fee", () => {
                it("Should transfer tokens to destination", async () => {
                    let { token } = await loadFixture(deploys);
                    let transferAmount = parseEther("2");

                    await fundOwner(token, transferAmount);

                    let ownerStartBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientStartBalance = await token.balanceOf(
                        clientAcc1.address
                    );
                    let marketingStartBalance = await token.balanceOf(
                        marketingAddress
                    );
                    let rewardsStartBalance = await token.balanceOf(
                        rewardsAddress
                    );

                    // Add client to whitelist
                    await token.addToWhitelist(clientAcc1.address);

                    await token.transfer(clientAcc1.address, transferAmount);
                    let ownerEndBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientEndBalance = await token.balanceOf(
                        clientAcc1.address
                    );
                    let marketingEndBalance = await token.balanceOf(
                        marketingAddress
                    );
                    let rewardsEndBalance = await token.balanceOf(
                        rewardsAddress
                    );

                    expect(ownerEndBalance).to.equal(
                        ownerStartBalance.sub(transferAmount)
                    );
                    expect(clientEndBalance).to.equal(
                        clientStartBalance
                            // 97% of transfer amount should get to client
                            .add(transferAmount.mul(97).div(100))
                    );
                    expect(marketingEndBalance).to.equal(
                        marketingStartBalance
                            // 1% of transfer amount should get to marketing
                            .add(transferAmount.div(100))
                    );
                    expect(rewardsEndBalance).to.equal(
                        rewardsStartBalance
                            // 1% of transfer amount should get to rewards
                            .add(transferAmount.div(100))
                    );
                    // 1% of transfer amount should get burnt
                });
            });
        });
        describe("Transfer from", () => {
            describe("Without fee", () => {
                it("Should transfer tokens to destination", async () => {
                    let { token } = await loadFixture(deploys);
                    let transferAmount = parseEther("2");

                    await fundOwner(token, transferAmount);

                    let ownerStartBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientStartBalance = await token.balanceOf(
                        clientAcc1.address
                    );

                    // Transfer by owner from the owner to make it simple
                    await token
                        .connect(ownerAcc)
                        .approve(ownerAcc.address, transferAmount);
                    await token.transferFrom(
                        ownerAcc.address,
                        clientAcc1.address,
                        transferAmount
                    );
                    let ownerEndBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientEndBalance = await token.balanceOf(
                        clientAcc1.address
                    );

                    expect(ownerEndBalance).to.equal(
                        ownerStartBalance.sub(transferAmount)
                    );
                    expect(clientEndBalance).to.equal(
                        clientStartBalance.add(transferAmount)
                    );
                });
            });
            describe("With fee", () => {
                it("Should transfer tokens to destination", async () => {
                    let { token } = await loadFixture(deploys);
                    let transferAmount = parseEther("2");

                    await fundOwner(token, transferAmount);

                    let ownerStartBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientStartBalance = await token.balanceOf(
                        clientAcc1.address
                    );
                    let marketingStartBalance = await token.balanceOf(
                        marketingAddress
                    );
                    let rewardsStartBalance = await token.balanceOf(
                        rewardsAddress
                    );

                    // Add client to whitelist
                    await token.addToWhitelist(clientAcc1.address);

                    // Transfer by owner from the owner to make it simple
                    await token
                        .connect(ownerAcc)
                        .approve(ownerAcc.address, transferAmount);
                    await token.transferFrom(
                        ownerAcc.address,
                        clientAcc1.address,
                        transferAmount
                    );
                    let ownerEndBalance = await token.balanceOf(
                        ownerAcc.address
                    );
                    let clientEndBalance = await token.balanceOf(
                        clientAcc1.address
                    );
                    let marketingEndBalance = await token.balanceOf(
                        marketingAddress
                    );
                    let rewardsEndBalance = await token.balanceOf(
                        rewardsAddress
                    );

                    expect(ownerEndBalance).to.equal(
                        ownerStartBalance.sub(transferAmount)
                    );
                    expect(clientEndBalance).to.equal(
                        clientStartBalance
                            // 97% of transfer amount should get to client
                            .add(transferAmount.mul(97).div(100))
                    );
                    expect(marketingEndBalance).to.equal(
                        marketingStartBalance
                            // 1% of transfer amount should get to marketing
                            .add(transferAmount.div(100))
                    );
                    expect(rewardsEndBalance).to.equal(
                        rewardsStartBalance
                            // 1% of transfer amount should get to rewards
                            .add(transferAmount.div(100))
                    );
                    // 1% of transfer amount should get burnt
                });
            });
        });
    });
});
