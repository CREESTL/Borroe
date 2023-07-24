// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.12;

/// @title Interface of the BORROE ERC20 token
interface IBorroe is IERC20 {
    event AddedToWhitelist(address indexed user);
    event RemovedFromWhitelist(address indexed user);

    /// @notice Adds a user to the whitelist
    /// @param user The user to add to the whitelist
    function addToWhitelist(address user) external;

    /// @notice Removes a user from the whitelist
    /// @param user The used to remove from the whitelist
    function removeFromWhitelist(address user) external;

    /// @notice Checks that address is whitelisted
    /// @param user The address of the user to check
    function checkWhitelisted(address user) external view returns (bool);

    /// @notice Returns the maximum total supply of tokens
    /// @return The maximum total supply of tokens
    function maxTotalSupply() external view returns (uint256);
}
