// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title The native ERC20 token for Borroe system.
contract BORROE is ERC20, Ownable {
    
    uint256 _maxTotalSupply = 1e9;

    constructor() ERC20("BORROE", "$ROE") {
        // TODO: Delete premint
        _mint(msg.sender, _maxTotalSupply * 10 ** decimals());
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    
}
