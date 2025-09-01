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

export class TurbosRouter implements DexRouter {
  private readonly versioned: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Turbos only supported on mainnet")
    }

    this.versioned =
      "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f"
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
      throw new Error("Turbos not set publishedAt")
    }

    const path = flattenedPath.path
    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    // Extract Fee type from extended details
    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    } else {
      if (path.extendedDetails.turbos_fee_type == null) {
        throw new Error("Turbos fee type not supported")
      }
    }
    const feeType = path.extendedDetails.turbos_fee_type

    return {
      coinAType,
      coinBType,
      feeType,
      direction: path.direction,
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
      feeType: string
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
      txb.object(this.versioned),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::turbos::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType, swapData.feeType],
      arguments: args,
    })
  }
}
