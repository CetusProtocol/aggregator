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

export class SteammOmmRouter implements DexRouter {
  private readonly pythPriceIDs: Map<string, string>
  private readonly oraclePackageId: string

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Steamm OMM only supported on mainnet")
    }

    this.pythPriceIDs = pythPriceIDs
    this.oraclePackageId =
      "0xe84b649199654d18c38e727212f5d8dacfc3cf78d60d0a7fc85fd589f280eb2b"
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for Steamm OMM")
    }

    this.validateExtendedDetails(path.extendedDetails)

    const swapData = this.prepareSwapData(flattenedPath)
    this.executeSwapContract(txb, swapData, swapContext)
  }

  private validateExtendedDetails(extendedDetails: any) {
    const requiredFields = [
      "steamm_bank_a",
      "steamm_bank_b",
      "steamm_lending_market",
      "steamm_lending_market_type",
      "steamm_btoken_a_type",
      "steamm_btoken_b_type",
      "steamm_lp_token_type",
      "steammOracleRegistryId",
      "steammOracleIndexA",
      "steammOracleIndexB",
      "steammOraclePythPriceSeedA",
      "steammOraclePythPriceSeedB",
    ]

    for (const field of requiredFields) {
      if (extendedDetails[field] == null) {
        throw new Error(`Steamm ${field} not supported`)
      }
    }
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Steamm OMM not set publishedAt")
    }
    const extendedDetails = path.extendedDetails!

    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b_v2", from, target]
      : ["swap_b2a_v2", target, from]

    // Use MAX_AMOUNT_IN for intermediate tokens on their last usage
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    // Get oracle price seeds
    const priceSeedA = extendedDetails.steamm_oracle_pyth_price_seed_a
    const priceSeedB = extendedDetails.steamm_oracle_pyth_price_seed_b

    if (!priceSeedA || !priceSeedB) {
      throw new Error("Steamm oracle price seeds not found")
    }

    const priceInfoObjectIdA = this.pythPriceIDs.get(priceSeedA)
    const priceInfoObjectIdB = this.pythPriceIDs.get(priceSeedB)

    if (!priceInfoObjectIdA || !priceInfoObjectIdB) {
      throw new Error(
        "Base price info object id or quote price info object id not found"
      )
    }

    return {
      func,
      coinAType,
      coinBType,
      direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
      extendedDetails,
      priceInfoObjectIdA,
      priceInfoObjectIdB,
    }
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      func: string
      coinAType: string
      coinBType: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      extendedDetails: any
      priceInfoObjectIdA: string
      priceInfoObjectIdB: string
    },
    swapContext: TransactionObjectArgument
  ) {
    const extendedDetails = swapData.extendedDetails

    // Create oracle price updates
    const oraclePriceUpdateA = txb.moveCall({
      target: `${this.oraclePackageId}::oracles::get_pyth_price`,
      typeArguments: [],
      arguments: [
        txb.object(extendedDetails.steammOracleRegistryId),
        txb.object(swapData.priceInfoObjectIdA),
        txb.pure.u64(extendedDetails.steammOracleIndexA),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    }) as TransactionObjectArgument

    const oraclePriceUpdateB = txb.moveCall({
      target: `${this.oraclePackageId}::oracles::get_pyth_price`,
      typeArguments: [],
      arguments: [
        txb.object(extendedDetails.steammOracleRegistryId),
        txb.object(swapData.priceInfoObjectIdB),
        txb.pure.u64(extendedDetails.steammOracleIndexB),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    }) as TransactionObjectArgument

    // Follow v2 implementation argument structure
    const args = [
      swapContext,
      txb.object(swapData.poolId),
      txb.object(extendedDetails.steamm_bank_a),
      txb.object(extendedDetails.steamm_bank_b),
      txb.object(extendedDetails.steamm_lending_market),
      oraclePriceUpdateA,
      oraclePriceUpdateB,
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::steamm_omm::${swapData.func}`,
      typeArguments: [
        extendedDetails.steamm_lending_market_type,
        swapData.coinAType,
        swapData.coinBType,
        extendedDetails.steamm_btoken_a_type,
        extendedDetails.steamm_btoken_b_type,
        extendedDetails.steamm_lp_token_type,
      ],
      arguments: args,
    })
  }
}
