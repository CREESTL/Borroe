// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IBorroe.sol";

/// @title The contract for BORROE tokens vesting
contract Vesting is IVesting, Ownable {
    using SafeERC20 for ERC20;

    /// @dev Used to convert from BPs to percents and vice versa
    uint256 private constant _BP_CONVERTER = 1e4;

    /// @dev Mapping from user to vesting assigned to him
    ///      Each user can have only one vesting
    mapping(address => TokenVesting) private _usersToVestings;

    /// @dev Numbers of periods user has claimed in the vesting
    ///      [User address => period number => bool]
    ///      Used to skip periods that user has already claimed
    mapping(address => mapping(uint256 => bool)) private _claimedPeriods;

    /// @notice The BORROE token address
    address public borroe;

    /// @dev List of initial token holders
    address[] private _initialHolders;

    /// @notice True if initial vestings have started
    ///         Vestings can only start once
    bool public vested = false;

    modifier ifNotVested() {
        require(!vested, "Vesting: Initial vestings already started");
        _;
    }

    /// @param initialHolders The list of addresses of initial token holders that
    ///        will receive tokens after vesting
    constructor(address[] memory initialHolders) {
        require(initialHolders.length > 0, "Vesting: No initial holders");
        _initialHolders = initialHolders;
    }

    /// @notice See {IVesting-startInitialVestings}
    function startInitialVestings(
        address[] memory initialHolders
    ) external onlyOwner ifNotVested {
        require(borroe != address(0), "Vesting: Invalid token address");
        // All holders receive the same share
        uint256 borroeBalance = IBorroe(borroe).balanceOf(address(this));
        require(borroeBalance > 1, "Vesting: Insufficient balance");
        uint256 holderShare = borroeBalance / initialHolders.length;
        vested = true;
        for (uint256 i = 0; i < initialHolders.length; i++) {
            address holder = initialHolders[i];
            _startVesting(holder, holderShare);
        }
    }

    /// @notice See {IVesting-setToken}
    function setToken(address token) external onlyOwner {
        require(token != address(0), "Vesting: Invalid token address");
        require(token != borroe, "Vesting: Same token");
        borroe = token;
        emit TokenChanged(token);
    }

    /// @notice See {IVesting-getUserVesting}
    function getUserVesting(
        address user
    ) external view returns (TokenVesting memory) {
        require(user != address(0), "Vesting: Invalid user address");
        require(vested, "Vesting: Vestings not started");
        return _usersToVestings[user];
    }

    /// @notice See {IVesting-claimVesting}
    function claimTokens() external {
        // Calculate the vested amount using the schedule
        uint256 vestedAmount = _calculateVestedAmount(msg.sender);

        if (vestedAmount > 0) {
            ERC20(borroe).safeTransfer(msg.sender, vestedAmount);

            emit VestingClaimed(msg.sender, vestedAmount);
        }
    }

    /// @dev Calculates amount of vested tokens available for claim for the user
    /// @param user The address of the user to calculated vested tokens for
    function _calculateVestedAmount(address user) private returns (uint256) {
        // Total amount available for the user
        uint256 totalAvailableAmount;

        TokenVesting storage vesting = _usersToVestings[user];

        require(
            vesting.status != VestingStatus.Claimed,
            "Vesting: Vesting already claimed"
        );

        // Each period the same amount is vested
        uint256 amountPerPeriod = vesting.amount / vesting.claimablePeriods;

        // Calculate the number of periods since start
        uint256 timeSinceStart = block.timestamp - vesting.startTime;
        // Each claim period is one month. Cannot be changed
        uint256 onePeriod = 1 days * 30;
        uint256 periodsSinceStart = timeSinceStart / onePeriod;

        // If user has already claimed current vesting in current period - no tokens can be claimed
        if (_claimedPeriods[user][periodsSinceStart]) {
            return 0;
        }

        uint256 unclaimedPeriods = 0;
        // If user has already claimed some part of vesting (several periods),
        // calculate the difference between the current period and the period he claimed
        // The resulting amount of periods will be used to calculate the available amount
        if (periodsSinceStart > vesting.lastClaimedPeriod) {
            unclaimedPeriods = periodsSinceStart - vesting.lastClaimedPeriod;
            // If there are too many unclaimed periods (user hasn't claimed
            // for a long time), decrease them. They cannot be greater than
            // the number of periods from last claimed period to
            // the last claimable period
            if (unclaimedPeriods > vesting.claimablePeriods) {
                unclaimedPeriods =
                    vesting.claimablePeriods -
                    vesting.lastClaimedPeriod;
            }
        }

        // Mark that user has claimed all periods since start to the current period
        _claimedPeriods[user][periodsSinceStart] = true;

        // Mark the last period user has claimed rewards
        vesting.lastClaimedPeriod += unclaimedPeriods;

        // Mark that user has claimed specific amount
        vesting.amountClaimed += unclaimedPeriods * amountPerPeriod;

        // Increment total claimed amount
        // Use only unclaimed periods
        totalAvailableAmount += unclaimedPeriods * amountPerPeriod;

        // If user has claimed the last period, the whole vesting was claimed
        if (vesting.lastClaimedPeriod == vesting.claimablePeriods) {
            vesting.status = VestingStatus.Claimed;
        }

        return totalAvailableAmount;
    }

    /// @dev Starts a single vesting for the user
    /// @param to The receiver of tokens
    /// @param amount The amount of tokens to vest
    function _startVesting(address to, uint256 amount) private onlyOwner {
        require(to != address(0), "Vesting: Invalid user address");
        require(amount != 0, "Vesting: Invalid amount");

        // Create a new vesting
        TokenVesting memory vesting = TokenVesting({
            status: VestingStatus.InProgress,
            to: to,
            amount: amount,
            amountClaimed: 0,
            startTime: block.timestamp,
            // Each vesting lasts for 3 months
            claimablePeriods: 3,
            lastClaimedPeriod: 0
        });

        // Mark that this vesting is assigned to the user
        _usersToVestings[to] = vesting;

        emit VestingStarted(to);
    }
}
