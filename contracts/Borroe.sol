// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title The native ERC20 token for Borroe system.
contract BORROE is ERC20, Ownable {
    
    uint256 public _maxTotalSupply = 1e9;

    /// @dev Converts from % to basis points and vice versa
    uint256 constant BP_CONVERTER = 1e4;
    
    // Addresses of initial token distribution destinations
    address private immutable _vesting;
    address private immutable _lock;
    address private immutable _liquidityPool;
    address private immutable _exchangeListing;
    address private immutable _marketing;
    address private immutable _treasury;
    address private immutable _rewards;

    // 50% 
    uint256 constant TO_VESTING = 5000;
    
    // 5% + 2.5%
    uint256 constant TO_LOCK = 750;
    
    // 10% 
    uint256 constant TO_LIQUIDITY_POOL = 1000;
    uint256 constant TO_EXCHANGE_LISTING = 1000;
    uint256 constant TO_MARKETING = 1000;
    uint256 constant TO_TREASURY = 1000;
    
    // 2.5%
    uint256 constant TO_REWARDS = 250;
    

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
        require(liquidityPool != address(0), "BORROE: Invalid liquidity pool address");
        require(exchangeListing != address(0), "BORROE: Invalid exchange listing address");
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
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_VESTING / BP_CONVERTER
        );

        // Mint tokens to lock contract
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_LOCK / BP_CONVERTER
        );

        // Mint tokens to liquidity pool
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_LIQUIDITY_POOL / BP_CONVERTER
        );

        // Mint tokens to exchange listing
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_EXCHANGE_LISTING / BP_CONVERTER
        );

        // Mint tokens to marketing
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_MARKETING / BP_CONVERTER
        );

        // Mint tokens to treasury
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_TREASURY / BP_CONVERTER
        );

        // Mint tokens to rewards
        _mint(
            vesting, 
            _maxTotalSupply * 10 ** decimals() * TO_REWARDS / BP_CONVERTER
        );
        
        
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    function maxTotalSupply() public view returns (uint256) {
        return _maxTotalSupply * 10 ** decimals();
    }
    
    
}
