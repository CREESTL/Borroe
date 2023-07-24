// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBorroe.sol";

/// @title The native ERC20 token for Borroe system.
contract BORROE is IBorroe, ERC20, Ownable {
    uint256 private constant _MAX_TOTAL_SUPPLY = 1e9;

    /// @dev Converts from % to basis points and vice versa
    uint256 private constant BP_CONVERTER = 1e4;

    // Addresses of initial token distribution destinations
    address private immutable _vesting;
    address private immutable _lock;
    address private immutable _liquidityPool;
    address private immutable _exchangeListing;
    address private immutable _marketing;
    address private immutable _treasury;
    address private immutable _rewards;

    // 50%
    uint256 private constant TO_VESTING = 5000;

    // 5% + 2.5%
    uint256 private constant TO_LOCK = 750;

    // 10%
    uint256 private constant TO_LIQUIDITY_POOL = 1000;
    uint256 private constant TO_EXCHANGE_LISTING = 1000;
    uint256 private constant TO_MARKETING = 1000;
    uint256 private constant TO_TREASURY = 1000;

    // 2.5%
    uint256 private constant TO_REWARDS = 250;

    // 1%
    uint256 private constant BURNT_ON_TRANSFER = 100;
    uint256 private constant TO_MARKETING_ON_TRANSFER = 100;
    uint256 private constant TO_REWARDS_ON_TRANSFER = 100;

    /// @dev If tokens are transfered to the whitelisted address,
    ///      3% of fees are charged
    /// @dev DEXes trading BORROE tokens should be whitelisted
    ///      so that users pay transaction fees (3%) when creating orders
    mapping(address => bool) private _whitelist;

    constructor(
        address vesting,
        address lock,
        address liquidityPool,
        address exchangeListing,
        address marketing,
        address treasury,
        address rewards
    ) ERC20("BORROE", "$ROE") {
        require(vesting != address(0), "BORROE: Invalid vesting address");
        require(lock != address(0), "BORROE: Invalid lock address");
        require(
            liquidityPool != address(0),
            "BORROE: Invalid liquidity pool address"
        );
        require(
            exchangeListing != address(0),
            "BORROE: Invalid exchange listing address"
        );
        require(marketing != address(0), "BORROE: Invalid marketing address");
        require(treasury != address(0), "BORROE: Invalid treasury address");
        require(rewards != address(0), "BORROE: Invalid rewards address");

        _vesting = vesting;
        _lock = lock;
        _liquidityPool = liquidityPool;
        _exchangeListing = exchangeListing;
        _marketing = marketing;
        _treasury = treasury;
        _rewards = rewards;

        // Mint tokens to vesting contract
        _mint(
            _vesting,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_VESTING) / BP_CONVERTER
        );

        // Mint tokens to lock contract
        _mint(
            _lock,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_LOCK) / BP_CONVERTER
        );

        // Mint tokens to liquidity pool
        _mint(
            _liquidityPool,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_LIQUIDITY_POOL) /
                BP_CONVERTER
        );

        // Mint tokens to exchange listing
        _mint(
            _exchangeListing,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_EXCHANGE_LISTING) /
                BP_CONVERTER
        );

        // Mint tokens to marketing
        _mint(
            _marketing,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_MARKETING) / BP_CONVERTER
        );

        // Mint tokens to treasury
        _mint(
            _treasury,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_TREASURY) / BP_CONVERTER
        );

        // Mint tokens to rewards
        _mint(
            _rewards,
            (_MAX_TOTAL_SUPPLY * 10 ** decimals() * TO_REWARDS) / BP_CONVERTER
        );
    }

    /// @notice See {IBorroe-maxTotalSupply}
    function maxTotalSupply() external pure returns (uint256) {
        return _MAX_TOTAL_SUPPLY * 10 ** decimals();
    }

    /// @notice See {IBorroe-checkWhitelisted}
    function checkWhitelisted(address user) external view returns (bool) {
        require(user != address(0), "BORROE: Invalid address");
        return _whitelist[user];
    }

    /// @notice See {IBorroe-addToWhitelist}
    function addToWhitelist(address user) external onlyOwner {
        require(user != address(0), "BORROE: Invalid address");
        require(!_whitelist[user], "BORROE: Address is already whitelisted");
        _whitelist[user] = true;
        emit AddedToWhitelist(user);
    }

    /// @notice See {IBorroe-removeFromWhitelist}
    function removeFromWhitelist(address user) external onlyOwner {
        require(user != address(0), "BORROE: Invalid address");
        require(_whitelist[user], "BORROE: Address is not whitelisted");
        _whitelist[user] = false;
        emit RemovedFromWhitelist(user);
    }

    /// @notice See {IBorroe-decimals}
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Custom transfer function that charges 3% of transfered amount
    ///      as fees and distributes them
    function transfer(
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        address owner = _msgSender();

        // Charge and distribute fees if destination address is whitelisted
        if (_whitelist[to]) {
            amount = _distributeFees(owner, amount);
        }

        _transfer(owner, to, amount);

        return true;
    }

    /// @notice Custom transfer function that charges 3% of transfered amount
    ///      as fees and distributes them
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);

        // Charge and distribute fees if destination address is whitelisted
        if (_whitelist[to]) {
            amount = _distributeFees(from, amount);
        }

        _transfer(from, to, amount);

        return true;
    }

    /// @dev Custom mint function limiting total supply
    /// @param account The receiver of tokens
    /// @param amount The amount of tokens to mint
    function _mint(address account, uint256 amount) internal override {
        require(
            totalSupply() + amount <= _MAX_TOTAL_SUPPLY * 10 ** decimals(),
            "BORROE: Mint exceeds max total supply"
        );

        super._mint(account, amount);
    }

    /// @dev Calculates parts of fee amount to be distributed among known destinations
    ///      and distributes them:
    ///      1% gets burnt
    ///      1% gets transfered to markeing wallet
    ///      1% gets transfered to rewards wallet
    function _distributeFees(
        address from,
        uint256 amount
    ) private returns (uint256) {
        require(
            from != address(0),
            "BORROE: Fees distributor cannot have zero address"
        );
        require(amount != 0, "BORROE: Invalid fee amount");
        uint256 burnt = (amount * BURNT_ON_TRANSFER) / BP_CONVERTER;
        uint256 toMarketing = (amount * TO_MARKETING_ON_TRANSFER) /
            BP_CONVERTER;
        uint256 toRewards = (amount * TO_REWARDS_ON_TRANSFER) / BP_CONVERTER;

        _burn(from, burnt);
        _transfer(from, _marketing, toMarketing);
        _transfer(from, _rewards, toRewards);

        uint256 decreasedAmount = amount - burnt - toMarketing - toRewards;

        return decreasedAmount;
    }
}
