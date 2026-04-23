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

export class BoltRouter implements DexRouter {
  constructor(_env: Env) {}

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for BOLT")
    }

    this.validateExtendedDetails(path.extendedDetails)

    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private validateExtendedDetails(extendedDetails: ExtendedDetails) {
    if (!extendedDetails.bolt_pool_id) {
      throw new Error("BOLT pool id not found in extended details")
    }
    if (!extendedDetails.bolt_oracle_id) {
      throw new Error("BOLT oracle id not found in extended details")
    }
    if (!extendedDetails.bolt_quote_coin_type) {
      throw new Error("BOLT quote coin type not found in extended details")
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (path.publishedAt == null) {
      throw new Error("BOLT not set publishedAt")
    }
    const extendedDetails = path.extendedDetails!

    // direction=true (a2b): from=base T0, target=quote T1 → swap_a2b (sell base)
    // direction=false (b2a): from=quote T1, target=base T0 → swap_b2a (buy base)
    const [baseType, quoteType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      baseType,
      quoteType,
      a2b: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: extendedDetails.bolt_pool_id!,
      oracleId: extendedDetails.bolt_oracle_id!,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      baseType: string
      quoteType: string
      a2b: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      oracleId: string
    },
    swapContext: TransactionObjectArgument
  ) {
    // bolt_router::bolt::swap<T0, T1>(
    //   swap_ctx: &mut SwapContext,
    //   pool: &mut LiquidityPool<T0>,
    //   oracle: &Oracle,
    //   clock: &Clock,
    //   a2b: bool,
    //   amount_in: u64,
    //   ctx: &mut TxContext,
    // )
    // T0 = base coin, T1 = quote coin
    // a2b=true: sell base T0 → receive quote T1 (swap_a2b / swap_sell)
    // a2b=false: spend quote T1 → receive base T0 (swap_b2a / swap_buy)
    txb.moveCall({
      target: `${swapData.publishedAt}::bolt::swap`,
      typeArguments: [swapData.baseType, swapData.quoteType],
      arguments: [
        swapContext,                              // swap_ctx
        txb.object(swapData.poolId),             // pool: &mut LiquidityPool<T0>
        txb.object(swapData.oracleId),           // oracle: &Oracle
        txb.object(SUI_CLOCK_OBJECT_ID),         // clock: &Clock
        txb.pure.bool(swapData.a2b),             // a2b: bool
        txb.pure.u64(swapData.amountIn),         // amount_in: u64
      ],
    })
  }
}
