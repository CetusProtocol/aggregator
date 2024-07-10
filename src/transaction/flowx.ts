import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorConfig, ENV } from "../config"
import {
  AGGREGATOR,
  FLOWX_AMM_MODULE,
  MAINNET_FLOWX_AMM_CONTAINER_ID,
  SWAP_A2B_FUNC,
  SWAP_B2A_FUNC,
  TESTNET_FLOWX_AMM_CONTAINER_ID,
} from "../const"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import { createTarget } from "../utils"

export type FlowxSwapParams = {
  amount: TransactionArgument
  amountLimit: number
  a2b: boolean
  byAmountIn: boolean
  coinA?: TransactionObjectArgument
  coinB?: TransactionObjectArgument
  useFullInputCoinAmount: boolean
  coinAType: string
  coinBType: string
}

export type FlowxSwapResult = {
  targetCoin: TransactionObjectArgument
  amountIn: TransactionArgument
  amountOut: TransactionArgument
  txb: Transaction
}

export async function flowxAmmSwapMovecall(
  swapParams: FlowxSwapParams,
  txb: Transaction,
  config: AggregatorConfig
): Promise<FlowxSwapResult> {
  console.log("flowx amm swap param", swapParams)
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

  const containerID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_FLOWX_AMM_CONTAINER_ID
      : TESTNET_FLOWX_AMM_CONTAINER_ID

  const swapCoin = swapParams.a2b ? swapParams.coinA! : swapParams.coinB!

  const args = [
    txb.object(containerID),
    swapParams.amount,
    txb.pure.u64(swapParams.amountLimit),
    swapCoin,
    txb.pure.bool(swapParams.useFullInputCoinAmount),
  ]

  const func = swapParams.a2b ? SWAP_A2B_FUNC : SWAP_B2A_FUNC

  const target = createTarget(aggregatorPublishedAt, FLOWX_AMM_MODULE, func)

  const res = txb.moveCall({
    target,
    typeArguments: [swapParams.coinAType, swapParams.coinBType],
    arguments: args,
  })
  return {
    targetCoin: res[0],
    amountIn: res[1],
    amountOut: res[2],
    txb,
  }
}
