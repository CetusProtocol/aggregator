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

export class SteammCPMMRouter implements DexRouter {
  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Steamm CPMM only supported on mainnet")
    }
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

  private validateExtendedDetails(extendedDetails: any) {
    const requiredFields = [
      "steamm_bank_a",
      "steamm_bank_b",
      "steamm_lending_market",
      "steamm_lending_market_type",
      "steamm_btoken_a_type",
      "steamm_btoken_b_type",
      "steamm_lp_token_type",
    ]

    for (const field of requiredFields) {
      if (extendedDetails[field] == null) {
        throw new Error(`Steamm CPMM ${field} not supported`)
      }
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Steamm CPMM not set publishedAt")
    }

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for Steamm CPMM")
    }

    // Validate extended details based on v2 implementation
    this.validateExtendedDetails(path.extendedDetails)

    const { direction, from, target } = path
    const [coinAType, coinBType] = direction ? [from, target] : [target, from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      coinAType,
      coinBType,
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
      coinAType: string
      coinBType: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      extendedDetails: any
    },
    swapContext: TransactionObjectArgument
  ) {
    // Follow v2 implementation argument structure
    const args = [
      swapContext,
      txb.object(swapData.poolId),
      txb.object(swapData.extendedDetails.steamm_bank_a),
      txb.object(swapData.extendedDetails.steamm_bank_b),
      txb.object(swapData.extendedDetails.steamm_lending_market),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::steamm_cpmm::swap`,
      typeArguments: [
        swapData.extendedDetails.steamm_lending_market_type,
        swapData.coinAType,
        swapData.coinBType,
        swapData.extendedDetails.steamm_btoken_a_type,
        swapData.extendedDetails.steamm_btoken_b_type,
        swapData.extendedDetails.steamm_lp_token_type,
      ],
      arguments: args,
    })
  }
}
