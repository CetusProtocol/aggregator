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
import { Env, FlattenedPath, SUI_SYSTEM_STATE_OBJECT_ID } from ".."
import * as Constants from "../const"

export class VoloRouter implements DexRouter {
  private readonly stakePool: string
  private readonly metadata: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Volo only supported on mainnet")
    }

    // Use the same addresses as V2 implementation
    this.stakePool =
      "0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5"
    this.metadata =
      "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60"
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
      throw new Error("Volo not set publishedAt")
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
    // Based on V2 implementation, use the same parameter structure
    const args = [
      swapContext,
      txb.object(this.stakePool),
      txb.object(this.metadata),
      txb.object(SUI_SYSTEM_STATE_OBJECT_ID),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::volo::swap`,
      typeArguments: [],
      arguments: args,
    })
  }
}
