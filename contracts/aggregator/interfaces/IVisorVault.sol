// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

// @title Hypervisor
// @notice from https://github.com/VisorFinance/hypervisor/blob/master/contracts/interfaces/IVault.sol
// rebalance function reomoved, as only open to supervisor roles
interface IVisorVault {
    function deposit(
        uint256,
        uint256,
        address
    ) external returns (uint256); // shares

    function withdraw(
        uint256,
        address,
        address
    ) external returns (uint256, uint256);

    function getTotalAmounts() external view returns (uint256, uint256);

    event Deposit(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1);

    event Withdraw(address indexed sender, address indexed to, uint256 shares, uint256 amount0, uint256 amount1);
}
