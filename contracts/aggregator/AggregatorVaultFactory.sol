// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IRebalancerType} from "./interfaces/IRebalancerType.sol";
import {AggregatorVault} from "./AggregatorVault.sol";

contract AggregatorVaultFactory is IRebalancerType, Ownable {
    event AggregatorVaultCreated(address aggregatorVault);

    address[] public aggregatorVaults;
    mapping(address => address) public getAggregatorVault;

    function createAggregatorVault(
        Rebalancer _rebalancer,
        address _vault,
        address _token0,
        address _token1
    ) external onlyOwner returns (address aggregatorVault) {
        aggregatorVault = address(
            new AggregatorVault{salt: keccak256(abi.encode(_vault))}(_rebalancer, _vault, _token0, _token1)
        );
        aggregatorVaults.push(aggregatorVault);
        getAggregatorVault[_vault] = aggregatorVault;
        emit AggregatorVaultCreated(aggregatorVault);
    }

    function getAggregatorVaults() external view returns (address[] memory) {
        return aggregatorVaults;
    }
}
