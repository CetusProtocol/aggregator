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
import { FlattenedPath } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { Env } from "../config"
import * as Constants from "../const"

export class ObricRouter implements DexRouter {
  private readonly pythStateObjectId: string
  private readonly pythPriceIDs: Map<string, string>

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env === Env.Testnet) {
      throw new Error("Obric is not supported on testnet")
    }

    this.pythStateObjectId =
      "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8"
    this.pythPriceIDs = pythPriceIDs
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
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Obric not set publishedAt")
    }

    if (!path.extendedDetails) {
      throw new Error("Extended details not supported in obric")
    }

    const { direction, from, target } = path
    const [coinAType, coinBType] = direction ? [from, target] : [target, from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    // Handle dual price feed approach - seeds or direct IDs
    let coinAPriceInfoObjectId: string | undefined
    let coinBPriceInfoObjectId: string | undefined

    if (
      path.extendedDetails.obric_coin_a_price_seed &&
      path.extendedDetails.obric_coin_b_price_seed
    ) {
      // Use price seeds to get IDs from pythPriceIDs map
      coinAPriceInfoObjectId = this.pythPriceIDs.get(
        path.extendedDetails.obric_coin_a_price_seed
      )
      coinBPriceInfoObjectId = this.pythPriceIDs.get(
        path.extendedDetails.obric_coin_b_price_seed
      )
    } else if (
      path.extendedDetails.obric_coin_a_price_id &&
      path.extendedDetails.obric_coin_b_price_id
    ) {
      // Use direct price IDs
      coinAPriceInfoObjectId = path.extendedDetails.obric_coin_a_price_id
      coinBPriceInfoObjectId = path.extendedDetails.obric_coin_b_price_id
    } else {
      throw new Error("Base price id or quote price id not supported")
    }

    return {
      coinAType,
      coinBType,
      coinAPriceInfoObjectId,
      coinBPriceInfoObjectId,
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
      coinAPriceInfoObjectId?: string
      coinBPriceInfoObjectId?: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      extendedDetails: any
    },
    swapContext: TransactionObjectArgument
  ) {
    if (!swapData.coinAPriceInfoObjectId || !swapData.coinBPriceInfoObjectId) {
      throw new Error(
        "Base price info object id or quote price info object id not found"
      )
    }

    const args = [
      swapContext,
      txb.object(swapData.poolId),
      txb.pure.u64(swapData.amountIn),
      txb.pure.bool(swapData.direction),
      txb.object(this.pythStateObjectId),
      txb.object(swapData.coinAPriceInfoObjectId),
      txb.object(swapData.coinBPriceInfoObjectId),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::obric::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }
}
