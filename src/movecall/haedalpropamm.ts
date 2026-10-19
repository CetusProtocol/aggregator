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

export class HaedalPropAmmRouter implements DexRouter {
  private readonly pythPriceIDs: Map<string, string>

  constructor(_env: Env, pythPriceIDs: Map<string, string>) {
    this.pythPriceIDs = pythPriceIDs
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for HAEDALPROPAMM")
    }

    this.validateExtendedDetails(path.extendedDetails)

    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private validateExtendedDetails(extendedDetails: ExtendedDetails) {
    if (!extendedDetails.haedalpropamm_pool_id) {
      throw new Error("HAEDALPROPAMM pool id not found in extended details")
    }
    if (!extendedDetails.haedalpropamm_regime_id) {
      throw new Error("HAEDALPROPAMM regime id not found in extended details")
    }
    // Only the Pyth Core oracle path is supported by the SDK adapter. The
    // "pro" (Pyth Lazer) path requires an off-chain `&Update` object that the
    // aggregator router does not surface here.
    if (extendedDetails.haedalpropamm_oracle_mode !== "pyth_core") {
      throw new Error(
        `HAEDALPROPAMM oracle mode "${extendedDetails.haedalpropamm_oracle_mode}" not supported (only "pyth_core")`
      )
    }
    if (!extendedDetails.haedalpropamm_base_price_info_object) {
      throw new Error(
        "HAEDALPROPAMM base price info object not found in extended details"
      )
    }
    if (!extendedDetails.haedalpropamm_quote_price_info_object) {
      throw new Error(
        "HAEDALPROPAMM quote price info object not found in extended details"
      )
    }
    if (!extendedDetails.haedalpropamm_base_price_seed) {
      throw new Error(
        "HAEDALPROPAMM base price seed not found in extended details"
      )
    }
    if (!extendedDetails.haedalpropamm_quote_price_seed) {
      throw new Error(
        "HAEDALPROPAMM quote price seed not found in extended details"
      )
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (path.publishedAt == null) {
      throw new Error("HAEDALPROPAMM not set publishedAt")
    }
    const extendedDetails = path.extendedDetails!

    // PoolState<T0, T1>: T0 = base coin, T1 = quote coin.
    // direction is `from == coin_base`:
    //   direction=true  (a2b / SellBase): from=base T0, target=quote T1
    //   direction=false (b2a / SellQuote): from=quote T1, target=base T0
    const [baseType, quoteType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    const basePriceSeed = extendedDetails.haedalpropamm_base_price_seed!
    const quotePriceSeed = extendedDetails.haedalpropamm_quote_price_seed!
    const basePriceInfoObject = this.pythPriceIDs.get(basePriceSeed)
    const quotePriceInfoObject = this.pythPriceIDs.get(quotePriceSeed)

    if (!basePriceInfoObject || !quotePriceInfoObject) {
      throw new Error(
        "HAEDALPROPAMM requires updated Pyth price info objects for both coins"
      )
    }

    return {
      baseType,
      quoteType,
      a2b: path.direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: extendedDetails.haedalpropamm_pool_id!,
      regimeId: extendedDetails.haedalpropamm_regime_id!,
      basePriceInfoObject,
      quotePriceInfoObject,
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
      regimeId: string
      basePriceInfoObject: string
      quotePriceInfoObject: string
    },
    swapContext: TransactionObjectArgument
  ) {
    // haedalpropamm_router::haedalpropamm::swap_{a2b,b2a}_pyth_core<T0, T1>(
    //   swap_ctx: &mut SwapContext,
    //   pool_state: &mut PoolState<T0, T1>,
    //   regime_state: &mut RegimeState,
    //   clock: &Clock,
    //   base_price_info_object: &PriceInfoObject,
    //   quote_price_info_object: &PriceInfoObject,
    //   amount_in: u64,
    //   ctx: &mut TxContext,
    // )
    // T0 = base coin, T1 = quote coin. Direction is encoded in the function
    // name (no a2b arg):
    //   a2b=true  → swap_a2b_pyth_core (sell base T0 → receive quote T1)
    //   a2b=false → swap_b2a_pyth_core (sell quote T1 → receive base T0)
    const fn = swapData.a2b ? "swap_a2b_pyth_core" : "swap_b2a_pyth_core"

    txb.moveCall({
      target: `${swapData.publishedAt}::haedalpropamm::${fn}`,
      typeArguments: [swapData.baseType, swapData.quoteType],
      arguments: [
        swapContext,                                      // swap_ctx
        txb.object(swapData.poolId),                      // pool_state
        txb.object(swapData.regimeId),                    // regime_state
        txb.object(SUI_CLOCK_OBJECT_ID),                  // clock
        txb.object(swapData.basePriceInfoObject),         // base_price_info_object
        txb.object(swapData.quotePriceInfoObject),        // quote_price_info_object
        txb.pure.u64(swapData.amountIn),                  // amount_in
      ],
    })
  }
}
