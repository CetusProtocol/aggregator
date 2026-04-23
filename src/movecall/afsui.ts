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
import * as Constants from "../const"

export class AfsuiRouter implements DexRouter {
  private readonly stakedSuiVault: string
  private readonly safe: string
  private readonly referVault: string
  private readonly validator: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("afSUI only supported on mainnet")
    }

    // Use the same addresses as V2 implementation
    this.stakedSuiVault =
      "0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d"
    this.safe =
      "0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610"
    this.referVault =
      "0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef"
    this.validator =
      "0xd30018ec3f5ff1a3c75656abf927a87d7f0529e6dc89c7ddd1bd27ecb05e3db2"
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
      throw new Error("AFSUI not set publishedAt")
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
    swapContext: TransactionObjectArgument
  ) {
    // AFSUI only supports SUI -> afSUI direction (a2b)
    if (!swapData.direction) {
      throw new Error("AFSUI not support b2a swap")
    }

    // Based on V2 implementation, use the same parameter structure
    const args = [
      swapContext,
      txb.object(this.stakedSuiVault),
      txb.object(this.safe),
      txb.object("0x5"), // SuiSystemState
      txb.object(this.referVault),
      txb.pure.address(this.validator),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::afsui::swap`,
      typeArguments: [],
      arguments: args,
    })
  }
}
