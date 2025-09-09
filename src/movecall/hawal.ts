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

export class HawalRouter implements DexRouter {
  private readonly staking: string
  private readonly validator: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Hawal only supported on mainnet")
    }

    this.staking =
      "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904"
    this.validator =
      "0x7b3ba6de2ae58283f60d5b8dc04bb9e90e4796b3b2e0dea75569f491275242e7"
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
      throw new Error("Hawal not set publishedAt")
    }
    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      coinAType,
      coinBType,
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
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    const args = [
      swapContext,
      txb.object(this.staking),
      txb.object(swapData.poolId),
      txb.object(this.validator),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::hawal::swap`,
      typeArguments: [],
      arguments: args,
    })
  }
}
