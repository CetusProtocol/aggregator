import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorConfig } from "../config"
import {
  AGGREGATOR,
  CLOCK_ADDRESS,
  SWAP_A2B_FUNC,
  SWAP_B2A_FUNC,
  TURBOS_MODULE,
  TURBOS_VERSIONED,
} from "../const"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import { createTarget } from "../utils"

export type TurbosSwapParams = {
  poolId: string
  amount: TransactionArgument
  amountLimit: number
  a2b: boolean
  byAmountIn: boolean
  coinA?: TransactionObjectArgument
  coinB?: TransactionObjectArgument
  useFullInputCoinAmount: boolean
  coinAType: string
  coinBType: string
  feeType: string
}

export type TurbosSwapResult = {
  targetCoin: TransactionObjectArgument
  amountIn: TransactionArgument
  amountOut: TransactionArgument
  txb: Transaction
}

export async function turbosSwapMovecall(
  swapParams: TurbosSwapParams,
  txb: Transaction,
  config: AggregatorConfig
): Promise<TurbosSwapResult> {
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  if (swapParams.a2b) {
    if (swapParams.coinA == null) {
      throw new AggregateError(
        "coinA is required",
        TransactionErrorCode.MissCoinA
      )
    }
  } else {
    if (swapParams.coinB == null) {
      throw new AggregateError(
        "coinB is required",
        TransactionErrorCode.MissCoinB
      )
    }
  }

  const sqrtPriceLimit = swapParams.a2b
    ? "4295048016"
    : "79226673515401279992447579055"

  const args = swapParams.a2b
    ? [
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        swapParams.coinA!,
        txb.pure.bool(swapParams.useFullInputCoinAmount),
        txb.pure.u128(sqrtPriceLimit),
        txb.object(CLOCK_ADDRESS),
        txb.object(TURBOS_VERSIONED),
      ]
    : [
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        swapParams.coinB!,
        txb.pure.bool(swapParams.useFullInputCoinAmount),
        txb.pure.u128(sqrtPriceLimit),
        txb.object(CLOCK_ADDRESS),
        txb.object(TURBOS_VERSIONED),
      ]

  const func = swapParams.a2b ? SWAP_A2B_FUNC : SWAP_B2A_FUNC

  const target = createTarget(aggregatorPublishedAt, TURBOS_MODULE, func)

  const res = txb.moveCall({
    target,
    typeArguments: [
      swapParams.coinAType,
      swapParams.coinBType,
      swapParams.feeType,
    ],
    arguments: args,
  })
  return {
    targetCoin: res[0],
    amountIn: res[1],
    amountOut: res[2],
    txb,
  }
}
