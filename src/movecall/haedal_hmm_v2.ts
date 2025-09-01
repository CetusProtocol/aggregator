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
import { Env, ExtendedDetails, FlattenedPath } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import * as Constants from "../const"

export class HaedalHMMV2Router implements DexRouter {
  private readonly pythPriceIDs: Map<string, string>

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Haedal HMM V2 only supported on mainnet")
    }

    this.pythPriceIDs = pythPriceIDs
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for Haedal HMM V2")
    }

    console.log("path.extendedDetails", path.extendedDetails)
    this.validateExtendedDetails(path.extendedDetails)

    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private validateExtendedDetails(extendedDetails: ExtendedDetails) {
    if (!extendedDetails.haedalhmmv2_base_price_seed) {
      throw new Error("Haedal HMM V2 base price seed not supported")
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Haedal HMM V2 not set publishedAt")
    }
    const extendedDetails = path.extendedDetails!

    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    // Get oracle price IDs using price seeds from extended details
    const basePriceSeed = extendedDetails.haedalhmmv2_base_price_seed!

    const basePriceId = this.pythPriceIDs.get(basePriceSeed)

    if (!basePriceId) {
      throw new Error("Haedal HMM V2 requires oracle price IDs for base coin")
    }

    return {
      coinAType,
      coinBType,
      basePriceId: basePriceId!,
      a2b: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      coinAType: string
      coinBType: string
      basePriceId: string
      a2b: boolean
      amountIn: string
      publishedAt: string
      poolId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    // V3 interface: swap<A, B>(
    //   swap_ctx, pool, base_price_pair_obj, quote_price_pair_obj,
    //   amount_in, a2b, clock, ctx
    // )
    const args = [
      swapContext, // swap_ctx
      txb.object(swapData.poolId), // pool
      txb.object(swapData.basePriceId), // base_price_pair_obj
      txb.pure.u64(swapData.amountIn), // amount_in
      txb.pure.bool(swapData.a2b), // a2b
      txb.object(SUI_CLOCK_OBJECT_ID), // clock
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::haedal_hmm_v2::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }
}
