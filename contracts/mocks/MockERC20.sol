// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock contract for tests
contract MockERC20 is ERC20 {
    constructor() ERC20("MockERC20", "MOCK") {}
}
