// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.4;

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAggregatorVault} from "./interfaces/IAggregatorVault.sol";
import {IRebalancerType} from "./interfaces/IRebalancerType.sol";
import {IVisorVault} from "./interfaces/IVisorVault.sol";

contract AggregatorVault is IAggregatorVault, IRebalancerType, ERC20Permit, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public vault;
    IERC20 public token0;
    IERC20 public token1;
    Rebalancer public rebalancer;

    constructor(
        Rebalancer _rebalancer,
        address _vault,
        address _token0,
        address _token1
    ) ERC20("Cargo Aggregator LP Token", "CLP") ERC20Permit("Cargo Aggregator LP Token") {
        rebalancer = _rebalancer;
        vault = _vault;
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function deposit(
        uint256 _token0Amount,
        uint256 _token1Amount,
        address _to
    ) external override returns (uint256 liquidity) {
        if (_token0Amount > 0) token0.safeTransferFrom(msg.sender, address(this), _token0Amount);
        if (_token1Amount > 0) token1.safeTransferFrom(msg.sender, address(this), _token1Amount);

        liquidity = _deposit(_token0Amount, _token1Amount, _to);
    }

    function withdraw(uint256 _liquidity, address _to) external override returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = _withdraw(_liquidity, _to, address(this));
    }

    function _deposit(
        uint256 _token0Amount,
        uint256 _token1Amount,
        address _to
    ) internal returns (uint256 liquidity) {
        if (rebalancer == Rebalancer.VISOR) {
            liquidity = _depositToVisor(_token0Amount, _token1Amount, _to);
        }

        _mint(_to, liquidity);
    }

    function _depositToVisor(
        uint256 _deposit0,
        uint256 _deposit1,
        address _to
    ) internal returns (uint256 shares) {
        shares = IVisorVault(vault).deposit(_deposit0, _deposit1, _to);
    }

    function _withdraw(
        uint256 _liquidity,
        address _to,
        address _from
    ) internal returns (uint256 amount0, uint256 amount1) {
        if (rebalancer == Rebalancer.VISOR) {
            (amount0, amount1) = _withdrawFromVisor(_liquidity, _to, _from);
        }

        _burn(msg.sender, _liquidity);
        token0.safeTransfer(_to, amount0);
        token1.safeTransfer(_to, amount1);
    }

    function _withdrawFromVisor(
        uint256 _shares,
        address _to,
        address _from
    ) internal returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = IVisorVault(vault).withdraw(_shares, _to, _from);
    }
}
