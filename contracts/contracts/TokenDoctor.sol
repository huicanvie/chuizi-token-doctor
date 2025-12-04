// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IUniswapV3Router.sol";


contract TokenDoctor {
  struct  CheckResult {
    bool buySuccess;
    bool sellSuccess;
    uint256 buyTax;
    uint256 sellTax;
    uint256 buyGasUsed;
    uint256 sellGasUsed;
    uint256 boughtAmount;
    uint256 soldEthAmount;
    string error;
  }

  // Error  return data
  error SimulationResult(
    bool buySuccess,
    bool sellSuccess,
    uint256 buyTax,
    uint256 sellTax,
    uint256 buyGasUsed,
    uint256 sellGasUsed,
    string error
  );

  // execute function
  function checkToken(
    address tokenAddress,
    address routerAddress,
    address wethAddress, // V3 need WETH address
    uint256 buyAmountEth,
    uint24 fee   // V3 pool fee, if 0 then use V2
  ) external payable returns (CheckResult memory result) {

    // 
    uint256 startGas;
    uint256 initialEthBal = address(this).balance;

    // --- 1. buy test ---
    startGas = gasleft();
    if (fee == 0) {
      // Uniswap V2 buy simulation
      // (Implementation omitted for brevity)
      address[] memory path = new address[](2);
      path[0] = wethAddress;
      path[1] = tokenAddress;

      try IUniswapV2Router(routerAddress).swapExactETHForTokensSupportingFeeOnTransferTokens{value: buyAmountEth}(
        0,
        path,
        address(this),
        block.timestamp
      ) {
        // Buy succeeded
        result.buySuccess = true;
      } catch Error(string memory reason) {
        // Buy failed with revert reason
        result.buySuccess = false;
        result.error = string(abi.encodePacked("V2 Buy failed: ", reason));
        return result;
      } catch {
        // Buy failed without revert reason
        result.buySuccess = false;
        result.error = "Buy failed";
        return result;
      }
    } else {
      // Uniswap V3 buy simulation
      // (Implementation omitted for brevity)
      // V3 router need WETH , input ETH, auto wrap to WETH
      IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
        tokenIn: wethAddress,
        tokenOut: tokenAddress,
        fee: fee,
        recipient: address(this),
        deadline: block.timestamp,
        amountIn: buyAmountEth,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      });

      try IUniswapV3Router(routerAddress).exactInputSingle{value: buyAmountEth}(params) {
        // Buy succeeded
        result.buySuccess = true;
      } catch Error(string memory reason) {
        // Buy failed with revert reason
        result.buySuccess = false;
        result.error = string(abi.encodePacked("V3 Buy failed: ", reason));
        return result;
      } catch {
        // Buy failed without revert reason
        result.buySuccess = false;
        result.error = "V3 Buy failed";
        return result;
      }
    }
    
    result.buyGasUsed = startGas - gasleft();

    // if buy error then return
    if (!result.buySuccess) {
      return result;
    }

    // compute bought amount
    result.boughtAmount = IERC20(tokenAddress).balanceOf(address(this));

    // --- 2. approve test ---
    // V2 and V3 use same approve method
    try IERC20(tokenAddress).approve(routerAddress, type(uint256).max) {
      // approve succeeded
    } catch {
      // approve failed
      result.sellSuccess = false;
      result.error = "Approve failed";
      return result;
    }

    // --- 3. sell test ---
    startGas = gasleft();
    if (fee == 0) {
      // Uniswap V2 sell simulation
      address[] memory path = new address[](2);
      path[0] = tokenAddress;
      path[1] = wethAddress;  

      try IUniswapV2Router(routerAddress).swapExactTokensForETHSupportingFeeOnTransferTokens(
        result.boughtAmount,
        0,
        path,
        address(this),
        block.timestamp
      ) {
        // Sell succeeded
        result.sellSuccess = true;
      // } catch Error(string memory reason) {
      //   // Sell failed with revert reason
      //   result.sellSuccess = false;
      //   result.error = string(abi.encodePacked("V2 Sell failed: ", reason));
      //   return result;
      } catch {
        // Sell failed without revert reason
        result.sellSuccess = false;
        result.error = "V2 Sell failed";
        return result;
      }
    } else {
       // V3 sell simulation
      IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
        tokenIn: tokenAddress,
        tokenOut: wethAddress,
        fee: fee,
        recipient: address(this),
        deadline: block.timestamp,
        amountIn: result.boughtAmount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      });
      try IUniswapV3Router(routerAddress).exactInputSingle(params) {
        // Sell succeeded
        result.sellSuccess = true;
      }catch {
        // Sell failed without revert reason
        result.sellSuccess = false;
        result.error = "V3 Sell failed";
        return result;
      }
    }
    result.sellGasUsed = startGas - gasleft();
    // --- 4. finalize result ---

    uint256 finalEthBal = address(this).balance;
    uint256  finalWethBal = IERC20(wethAddress).balanceOf(address(this));
   
   // if WETH balance is 0
   uint256 totalEthBack = (finalEthBal - (initialEthBal - buyAmountEth)) + finalWethBal;
    result.soldEthAmount = totalEthBack;
    // compute taxes
    if (buyAmountEth > totalEthBack) {
      uint256 loss = buyAmountEth - totalEthBack;
      // approximate tax calculation
      // autally tax = (buyTax + sellTax + Slippage)
      result.sellTax = (loss * 1000) / buyAmountEth; // in per mille
      //result.sellTax = result.buyTax; // assume same tax for sell
    } else {

      result.sellTax = 0;
    
    }
    return result;
  }

  function simulation(
    address tokenAddress,
    address routerAddress,
    address wethAddress,
    uint24 fee
  ) external payable {
    CheckResult memory result = this.checkToken{value: msg.value}(
      tokenAddress,
      routerAddress,
      wethAddress,
      msg.value,
      fee
    );

    revert SimulationResult(
      result.buySuccess,
      result.sellSuccess,
      result.buyTax,
      result.sellTax,
      result.buyGasUsed,
      result.sellGasUsed,
      result.error
    );
  }

}