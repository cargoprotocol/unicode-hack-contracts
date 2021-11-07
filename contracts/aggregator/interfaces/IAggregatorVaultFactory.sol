// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {IRebalancerType} from "./IRebalancerType.sol";

interface IAggregatorVaultFactory is IRebalancerType {
    event AggregatorVaultCreated(address aggregatorVault);

    function createAggregatorVault(
        Rebalancer _rebalancer,
        address _vault,
        address _token0,
        address _token1
    ) external returns (address aggregatorVault);

    function getAggregatorVaults() external view returns (address[] memory);
}
