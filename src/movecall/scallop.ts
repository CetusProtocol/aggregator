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

export class ScallopRouter implements DexRouter {
  private readonly version: string
  private readonly marketData: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Scallop only supported on mainnet")
    }

    this.version =
      "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7"
    this.marketData =
      "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9"
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
      throw new Error("Scallop not set publishedAt")
    }
    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.from, path.target]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    // get scallop scoin treasury
    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    }
    const scallopScoinTreasury =
      path.extendedDetails.scallopScoinTreasury ||
      path.extendedDetails.scallop_scoin_treasury
    if (scallopScoinTreasury == null) {
      throw new Error("Scallop scoin treasury not supported")
    }

    return {
      coinAType,
      coinBType,
      direction: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
      scallopScoinTreasury,
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
      scallopScoinTreasury: string
    },
    swapContext: TransactionObjectArgument
  ) {
    const args = [
      swapContext,
      txb.object(this.version),
      txb.object(this.marketData),
      txb.object(swapData.scallopScoinTreasury),
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    // Use directional functions like V2 implementation
    const func = swapData.direction ? "swap_a2b" : "swap_b2a"

    txb.moveCall({
      target: `${swapData.publishedAt}::scallop::${func}`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }
}
