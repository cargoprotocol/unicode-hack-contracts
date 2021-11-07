// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

interface IAggregatorVault {
    function deposit(uint256 _token0Amount, uint256 _token1Amount) external returns (uint256 liquidity);

    function withdraw(uint256 _liquidity, address _to) external returns (uint256 amount0, uint256 amount1);
}
