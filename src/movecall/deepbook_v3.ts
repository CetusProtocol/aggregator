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

export class DeepbookV3Router implements DexRouter {
  private readonly env: Env
  private readonly globalConfig: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("DeepBook V3 only supported on mainnet")
    }

    this.env = env
    this.globalConfig =
      "0x699d455ab8c5e02075b4345ea1f91be55bf46064ae6026cc2528e701ce3ac135"
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
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("DeepBook V3 not set publishedAt")
    }

    const path = flattenedPath.path
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
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    // DeepBook V3 requires DEEP token for fees - create zero coin if not provided
    const deepCoin =
      _extends?.deepbookv3DeepFee ||
      txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [this.getDeepFeeType()],
      })

    const args = [
      swapContext,
      txb.object(this.globalConfig),
      txb.object(swapData.poolId),
      txb.pure.u64(swapData.amountIn),
      txb.pure.bool(swapData.direction),
      deepCoin,
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::deepbookv3::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }

  private getDeepFeeType(): string {
    return this.env === Env.Mainnet
      ? Constants.DEEPBOOK_V3_DEEP_FEE_TYPES.Mainnet
      : Constants.DEEPBOOK_V3_DEEP_FEE_TYPES.Testnet
  }
}
