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
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import * as Constants from "../const"

/** @deprecated SevenK DEX is no longer active. This router will be removed in a future version. */
export class SevenkRouter implements DexRouter {
  private readonly oraclePublishedAt: string
  private readonly pythPriceIDs: Map<string, string>

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Sevenk only supported on mainnet")
    }

    this.oraclePublishedAt = "0x8c36ea167c5e6da8c3d60b4fc897416105dcb986471bd81cfbfd38720a4487c0"
    this.pythPriceIDs = pythPriceIDs
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext, _extends)
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Sevenk not set publishedAt")
    }
    
    if (!path.extendedDetails) {
      throw new Error("Extended details not found for Sevenk")
    }
    
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken 
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN 
      : path.amountIn

    // Get extended details using snake_case fields (v3 API format)
    const extDetails = path.extendedDetails as any
    if (
      !extDetails.sevenk_coin_a_price_seed ||
      !extDetails.sevenk_coin_b_price_seed ||
      !extDetails.sevenk_oracle_config_a ||
      !extDetails.sevenk_oracle_config_b ||
      !extDetails.sevenk_lp_cap_type
    ) {
      throw new Error("Required Sevenk extended details not found")
    }
    
    const coinAPriceSeed = extDetails.sevenk_coin_a_price_seed
    const coinBPriceSeed = extDetails.sevenk_coin_b_price_seed
    const coinAOracleId = extDetails.sevenk_oracle_config_a
    const coinBOracleId = extDetails.sevenk_oracle_config_b
    const lpCapType = extDetails.sevenk_lp_cap_type
    
    const coinAPriceId = this.pythPriceIDs.get(coinAPriceSeed)
    const coinBPriceId = this.pythPriceIDs.get(coinBPriceSeed)

    if (!coinAPriceId || !coinBPriceId) {
      throw new Error("Sevenk price info object IDs not found")
    }

    return {
      func,
      coinAType,
      coinBType,
      coinAPriceId,
      coinBPriceId,
      coinAOracleId,
      coinBOracleId,
      lpCapType,
      direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
      extendedDetails: path.extendedDetails,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      func: string
      coinAType: string
      coinBType: string
      coinAPriceId: string
      coinBPriceId: string
      coinAOracleId: string
      coinBOracleId: string
      lpCapType: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      extendedDetails: any
    },
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    // Create oracle holder similar to v2 implementation
    const holder = txb.moveCall({
      target: `${this.oraclePublishedAt}::oracle::new_holder`,
      typeArguments: [],
      arguments: [],
    })

    // Get prices for both coins
    txb.moveCall({
      target: `${this.oraclePublishedAt}::pyth::get_price`,
      typeArguments: [],
      arguments: [
        txb.object(swapData.coinAOracleId),
        holder,
        txb.object(swapData.coinAPriceId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })

    txb.moveCall({
      target: `${this.oraclePublishedAt}::pyth::get_price`,
      typeArguments: [],
      arguments: [
        txb.object(swapData.coinBOracleId),
        holder,
        txb.object(swapData.coinBPriceId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })

    // Execute the swap following v2 pattern  
    const args = [
      swapContext,
      txb.object(swapData.poolId),
      holder,
      txb.pure.u64(swapData.amountIn),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::sevenk::${swapData.func}`,
      typeArguments: [swapData.coinAType, swapData.coinBType, swapData.lpCapType],
      arguments: args,
    })
  }

}