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

export class MagmaPropAmmRouter implements DexRouter {
  constructor(_env: Env) {}

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for MAGMAPROPAMM")
    }

    this.validateExtendedDetails(path.extendedDetails)

    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private validateExtendedDetails(extendedDetails: ExtendedDetails) {
    if (!extendedDetails.magmapropamm_pool_id) {
      throw new Error("MAGMAPROPAMM pool id not found in extended details")
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (path.publishedAt == null) {
      throw new Error("MAGMAPROPAMM not set publishedAt")
    }
    const extendedDetails = path.extendedDetails!

    // Pool<T0, T1>: T0 = X, T1 = Y
    // direction=true (a2b): spend from (T0) → receive target (T1)
    // direction=false (b2a): spend from (T1) → receive target (T0)
    const [coinTType0, coinTType1] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      coinTType0,
      coinTType1,
      a2b: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: extendedDetails.magmapropamm_pool_id!,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      coinTType0: string
      coinTType1: string
      a2b: boolean
      amountIn: string
      publishedAt: string
      poolId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    // magmapropamm_router::magmapropamm::swap<T0, T1>(
    //   swap_ctx: &mut SwapContext,
    //   pool: &mut Pool<T0, T1>,
    //   clock: &Clock,
    //   a2b: bool,
    //   amount_in: u64,
    //   ctx: &mut TxContext,
    // )
    txb.moveCall({
      target: `${swapData.publishedAt}::magmapropamm::swap`,
      typeArguments: [swapData.coinTType0, swapData.coinTType1],
      arguments: [
        swapContext,                              // swap_ctx
        txb.object(swapData.poolId),             // pool
        txb.object(SUI_CLOCK_OBJECT_ID),         // clock
        txb.pure.bool(swapData.a2b),             // a2b
        txb.pure.u64(swapData.amountIn),         // amount_in
      ],
    })
  }
}
