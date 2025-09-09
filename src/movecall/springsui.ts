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

export class SpringsuiRouter implements DexRouter {
  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Springsui only supported on mainnet")
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

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Springsui not set publishedAt")
    }
    const springSUICoinType = path.direction ? path.target : path.from

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      springSUICoinType,
      direction: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      springSUICoinType: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    const args = [
      swapContext,
      txb.object(swapData.poolId),
      txb.object("0x5"),
      txb.pure.u64(swapData.amountIn),
      txb.pure.bool(swapData.direction),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::springsui::swap`,
      typeArguments: [swapData.springSUICoinType],
      arguments: args,
    })
  }
}
