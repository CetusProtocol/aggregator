// Copyright 2025 0xBondSui <sugar@cetus.zone>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { DexRouter, Extends } from "."
import { Env, FlattenedPath } from ".."

export class AftermathRouter implements DexRouter {
  private readonly poolRegistry: string
  private readonly protocolFeeVault: string
  private readonly treasury: string
  private readonly insuranceFund: string
  private readonly referralVault: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Aftermath only supported on mainnet")
    }

    // Aftermath contract object IDs - defined locally following V3 router pattern
    this.poolRegistry =
      "0xfcc774493db2c45c79f688f88d28023a3e7d98e4ee9f48bbf5c7990f651577ae"
    this.protocolFeeVault =
      "0xf194d9b1bcad972e45a7dd67dd49b3ee1e3357a00a50850c52cd51bb450e13b4"
    this.treasury =
      "0x28e499dff5e864a2eafe476269a4f5035f1c16f338da7be18b103499abf271ce"
    this.insuranceFund =
      "0xf0c40d67b078000e18032334c3325c47b9ec9f3d9ae4128be820d54663d14e3b"
    this.referralVault =
      "0x35d35b0e5b177593d8c3a801462485572fc30861e6ce96a55af6dc4730709278"
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Aftermath not set publishedAt")
    }

    const path = flattenedPath.path
    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? "18446744073709551615" // MAX_AMOUNT_IN (U64_MAX)
      : path.amountIn

    return {
      coinAType,
      coinBType,
      feeType:
        path.extendedDetails?.aftermath_lp_supply_type ||
        (path.extendedDetails as any)?.aftermath_lp_supply_type ||
        "0x2::sui::SUI", // Use LP supply type from path (handle both camelCase and snake_case)
      direction: path.direction,
      amountIn,
      expectAmountOut: path.amountOut, // For amount-in swaps, expect_amount_out is 0
      publishedAt: path.publishedAt!,
      poolId: path.id,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      coinAType: string
      coinBType: string
      feeType: string
      direction: boolean
      amountIn: string
      expectAmountOut: string
      publishedAt: string
      poolId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    const args = [
      swapContext, // swap_ctx
      txb.object(swapData.poolId), // pool
      txb.object(this.poolRegistry), // pool_registry
      txb.object(this.protocolFeeVault), // vault
      txb.object(this.treasury), // treasury
      txb.object(this.insuranceFund), // insurance_fund
      txb.object(this.referralVault), // referral_vault
      txb.pure.bool(swapData.direction), // a2b
      txb.pure.u64(swapData.amountIn), // amount_in
      txb.pure.u64(swapData.expectAmountOut), // expect_amount_out
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::aftermath::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType, swapData.feeType],
      arguments: args,
    })
  }
}
