import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { DexRouter, Extends } from "."
import { Env, FlattenedPath } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import * as Constants from "../const"

export class FullsailRouter implements DexRouter {
  private globalConfig: string
  private vault: string
  private stats: string
  private price_provider: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Fullsail only supported on mainnet")
    }

    this.globalConfig =
      "0xe93baa80cb570b3a494cbf0621b2ba96bc993926d34dc92508c9446f9a05d615"
    this.vault =
      "0xfb971d3a2fb98bde74e1c30ba15a3d8bef60a02789e59ae0b91660aeed3e64e1"
    this.stats =
      "0x6822a33d1d971e040c32f7cc74507010d1fe786f7d06ab89135083ddb07d2dc2"
    this.price_provider =
      "0x854b2d2c0381bb656ec962f8b443eb082654384cf97885359d1956c7d76e33c9"
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
      throw new Error("Fullsail not set publishedAt")
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
      txb.object(this.globalConfig),
      txb.object(this.vault),
      txb.object(this.stats),
      txb.object(this.price_provider),
      txb.object(swapData.poolId),
      txb.pure.bool(swapData.direction),
      txb.pure.u64(swapData.amountIn),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${swapData.publishedAt}::fullsail::swap`,
      typeArguments: [swapData.coinAType, swapData.coinBType],
      arguments: args,
    })
  }
}
