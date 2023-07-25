// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

/// @notice Interface of the Vesting contract
interface IVesting {
    enum VestingStatus {
        InProgress,
        Claimed
    }

    /// @dev Structure representing a single vesting
    struct TokenVesting {
        // The status of vesting
        VestingStatus status;
        // The recipient of tokens
        address to;
        // The total amount of tokens to be vested
        uint256 amount;
        // The amount of claimed tokens.
        uint256 amountClaimed;
        // The moment vesting was started
        uint256 startTime;
        // The number of periods in which user can claim tokens
        uint256 claimablePeriods;
        // The number of the last period a user has claimed tokens
        uint256 lastClaimedPeriod;
    }

    /// @notice Indicates that a new vesting has
    /// @param user The address of user 
    event VestingStarted(
        address user
    );

    /// @notice Indicates that user has claimed vested tokens
    /// @param user The address of the user
    /// @param amount The amount of tokens claimed
    event VestingClaimed(address user, uint256 amount);
    
    /// @notice Indicates that address of BORROE token was changed
    /// @param token The new address of the BORROE token
    event TokenChanged(address token);
    
    /// @notice Change BORROE token address
    /// @param token The new address of the BORROE address
    function setToken(address token) external;
    
    /// @dev Starts initial vestings for the list of holders.
    ///      All BORROE tokens on this contract are vested
    ///      Vestings can only happen once
    /// @param initialHolders The list of holders to receive vested tokens
    function startInitialVestings(address[] memory initialHolders) external;

    /// @notice Returns information about the user's vesting
    /// @param user The address of the user
    /// @return The complete information about specific vesting
    function getUserVesting(address user) external view returns(TokenVesting memory);

    /// @notice Allows a user to claim tokens that were vested by admin for him
    function claimTokens() external;
}
