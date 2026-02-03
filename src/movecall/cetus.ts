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
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { DexRouter, Extends } from "."
import { Env, FlattenedPath, Path } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import * as Constants from "../const"

export type CetusFlashSwapResultV3 = {
  flashReceipt: TransactionObjectArgument
  repayAmount: TransactionArgument
}

export class CetusRouter implements DexRouter {
  private readonly globalConfig: string
  private readonly partner: string

  constructor(env: Env, partner?: string) {
    this.globalConfig =
      env === Env.Mainnet
        ? "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f"
        : "0xc6273f844b4bc258952c4e477697aa12c918c8e08106fac6b934811298c9820a"

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0x639b5e433da31739e800cd085f356e64cae222966d0f1b11bd9dc76b322ff58b"
        : "0xfdc30896f88f74544fd507722d3bf52e46b06412ba8241ba0e854cbc65f8d85f")
  }

  // By amount in
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
      throw new Error("Cetus not set publishedAt")
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
    const args = [
      swapContext,
      txb.object(this.globalConfig),
      txb.object(swapData.poolId),
      txb.object(this.partner),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::cetus::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }

  // By amount out
  flashSwapFixedOutput(
    txb: Transaction,
    path: Path,
    amountOut: TransactionArgument,
    swapContext: TransactionObjectArgument
  ): CetusFlashSwapResultV3 {
    const args = [
      swapContext,
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      amountOut,
      txb.pure.bool(path.direction),
      txb.pure.bool(false), // isExactIn
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const [flashReceipt, repayAmount] = txb.moveCall({
      target: `${path.publishedAt}::cetus::flash_swap_fixed_output`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })

    const res: CetusFlashSwapResultV3 = {
      flashReceipt,
      repayAmount,
    }
    return res
  }

  repayFlashSwapFixedOutput(
    txb: Transaction,
    path: Path,
    swapContext: TransactionObjectArgument,
    receipt: TransactionObjectArgument
  ) {
    const args = [
      swapContext,
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      txb.pure.bool(path.direction),
      receipt,
    ]

    const [coinAType, coinBType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    txb.moveCall({
      target: `${path.publishedAt}::cetus::repay_flash_swap_fixed_output`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
  }

  add(
    txb: Transaction,
    x: TransactionArgument,
    y: TransactionArgument,
    publishedAt: string
  ): TransactionArgument {
    const args = [x, y]

    const res = txb.moveCall({
      target: `${publishedAt}::cetus::add`,
      typeArguments: [],
      arguments: args,
    }) as TransactionArgument
    return res
  }

  sub(
    txb: Transaction,
    x: TransactionArgument,
    y: TransactionArgument,
    publishedAt: string
  ): TransactionArgument {
    const args = [x, y]

    const res = txb.moveCall({
      target: `${publishedAt}::cetus::sub`,
      typeArguments: [],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
