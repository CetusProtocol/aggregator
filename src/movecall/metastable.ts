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
import { FlattenedPath } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { Env } from "../config"
import * as Constants from "../const"

const SUPER_SUI_TYPE =
  "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI"
const MUSD_TYPE =
  "0xe44df51c0b21a27ab915fa1fe2ca610cd3eaa6d9666fe5e62b988bf7f0bd8722::musd::MUSD"
const METH_TYPE =
  "0xccd628c2334c5ed33e6c47d6c21bb664f8b6307b2ac32c2462a61f69a31ebcee::meth::METH"

export class MetastableRouter implements DexRouter {
  private readonly versionID: string
  private readonly pythPriceIDs: Map<string, string>

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Metastable only supported on mainnet")
    }

    this.versionID =
      "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c"
    this.pythPriceIDs = pythPriceIDs
  }

  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const swapData = this.prepareSwapData(flattenedPath)
    const depositCap = this.createDepositCap(txb, swapData)
    this.executeSwapContract(txb, swapData, swapContext, depositCap)
  }

  private prepareSwapData(flattenedPath: FlattenedPath) {
    const path = flattenedPath.path
    if (flattenedPath.path.publishedAt == null) {
      throw new Error("Metastable not set publishedAt")
    }

    if (!path.extendedDetails) {
      throw new Error("Extended details not found for Metastable")
    }

    const { direction, from, target } = path
    const [coinType, metaCoinType] = direction ? [from, target] : [target, from]

    const [func, createCapFunc] = direction
      ? ["swap_a2b", "create_deposit_cap"]
      : ["swap_b2a", "create_withdraw_cap"]

    if (
      !path.extendedDetails.metastable_create_cap_pkg_id ||
      !path.extendedDetails.metastable_create_cap_module ||
      !path.extendedDetails.metastable_whitelisted_app_id
    ) {
      throw new Error(
        "CreateCapPkgId or CreateCapModule or WhitelistedAppId not found in extended details"
      )
    }
    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    return {
      coinType,
      metaCoinType,
      func,
      createCapFunc,
      direction,
      amountIn,
      publishedAt: path.publishedAt!,
      poolId: path.id,
      extendedDetails: path.extendedDetails,
    }
  }

  private createDepositCap(
    txb: Transaction,
    swapData: {
      coinType: string
      metaCoinType: string
      func: string
      createCapFunc: string
      direction: boolean
      amountIn: string
      publishedAt: string
      extendedDetails: any
      poolId: string
    }
  ): TransactionObjectArgument {
    const createDepositCapTypeArgs = [swapData.metaCoinType]
    if (swapData.extendedDetails.metastable_create_cap_all_type_params) {
      createDepositCapTypeArgs.push(swapData.coinType)
    }

    const depositArgs = [
      txb.object(swapData.extendedDetails.metastable_whitelisted_app_id),
      txb.object(swapData.poolId),
    ]

    switch (swapData.metaCoinType) {
      case SUPER_SUI_TYPE: {
        if (!swapData.extendedDetails.metastable_registry_id) {
          throw new Error("Not found registry id for super sui")
        }
        depositArgs.push(
          txb.object(swapData.extendedDetails.metastable_registry_id)
        )
        break
      }
      case MUSD_TYPE:
      case METH_TYPE: {
        if (swapData.extendedDetails.metastable_price_seed != null) {
          const priceId = this.pythPriceIDs.get(
            swapData.extendedDetails.metastable_price_seed
          )
          if (priceId == null) {
            throw new Error(
              "Invalid Pyth price feed: " +
                swapData.extendedDetails.metastable_price_seed
            )
          }
          depositArgs.push(txb.object(priceId))
        }
        if (swapData.extendedDetails.metastable_eth_price_seed != null) {
          const priceId = this.pythPriceIDs.get(
            swapData.extendedDetails.metastable_eth_price_seed
          )
          if (priceId == null) {
            throw new Error(
              "Invalid Pyth price feed: " +
                swapData.extendedDetails.metastable_eth_price_seed
            )
          }
          depositArgs.push(txb.object(priceId))
        }
        depositArgs.push(txb.object(SUI_CLOCK_OBJECT_ID))
        break
      }
      default:
        throw new Error("Invalid Metacoin: " + swapData.metaCoinType)
    }

    return txb.moveCall({
      target: `${swapData.extendedDetails.metastable_create_cap_pkg_id}::${swapData.extendedDetails.metastable_create_cap_module}::${swapData.createCapFunc}`,
      typeArguments: createDepositCapTypeArgs,
      arguments: depositArgs,
    }) as TransactionObjectArgument
  }

  private executeSwapContract(
    txb: Transaction,
    swapData: {
      coinType: string
      metaCoinType: string
      func: string
      createCapFunc: string
      direction: boolean
      amountIn: string
      publishedAt: string
      poolId: string
      extendedDetails: any
    },
    swapContext: TransactionObjectArgument,
    depositCap: TransactionObjectArgument
  ) {
    const args = [
      swapContext,
      txb.object(swapData.poolId),
      txb.object(this.versionID),
      depositCap,
      txb.pure.u64(swapData.amountIn),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::metastable::${swapData.func}`,
      typeArguments: [swapData.coinType, swapData.metaCoinType],
      arguments: args,
    })
  }
}
