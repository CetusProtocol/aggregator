import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorConfig } from "../config"
import {
  AGGREGATOR,
  CLOCK_ADDRESS,
  DEEPBOOK_MODULE,
  SWAP_A2B_FUNC,
  SWAP_B2A_FUNC,
  TRANSFER_ACCOUNT_CAP,
} from "../const"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import { createTarget } from "../utils"
import { getOrCreateAccountCap } from "../utils/account_cap"
import { SuiClient } from "@mysten/sui/client"

export type DeepbookSwapParams = {
  poolId: string
  a2b: boolean
  amount: TransactionArgument
  amountLimit: number
  coinA?: TransactionObjectArgument
  coinB?: TransactionObjectArgument
  useFullInputCoinAmount: boolean
  coinAType: string
  coinBType: string
}

export type DeepbookSwapResult = {
  targetCoin: TransactionObjectArgument
  amountIn: TransactionArgument
  amountOut: TransactionArgument
  txb: Transaction
}

export async function deepbookSwapMovecall(
  swapParams: DeepbookSwapParams,
  client: SuiClient,
  txb: Transaction,
  config: AggregatorConfig
): Promise<DeepbookSwapResult> {
  const accountCapRes = await getOrCreateAccountCap(
    txb,
    client,
    config.getWallet()
  )
  const accountCap = accountCapRes.accountCap

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

  const args = swapParams.a2b
    ? [
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        swapParams.coinA!,
        accountCap,
        txb.pure.bool(swapParams.useFullInputCoinAmount),
        txb.object(CLOCK_ADDRESS),
      ]
    : [
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        swapParams.coinB!,
        accountCap,
        txb.pure.bool(swapParams.useFullInputCoinAmount),
        txb.object(CLOCK_ADDRESS),
      ]

  let func = swapParams.a2b ? SWAP_A2B_FUNC : SWAP_B2A_FUNC
  const target = createTarget(aggregatorPublishedAt, DEEPBOOK_MODULE, func)

  const res = txb.moveCall({
    target,
    typeArguments: [swapParams.coinAType, swapParams.coinBType],
    arguments: args,
  })

  if (accountCapRes.isCreate) {
    const target = createTarget(
      aggregatorPublishedAt,
      DEEPBOOK_MODULE,
      TRANSFER_ACCOUNT_CAP
    )

    const res = txb.moveCall({
      target,
      typeArguments: [],
      arguments: [accountCap],
    })
  }

  return {
    targetCoin: res[0],
    amountIn: res[1],
    amountOut: res[2],
    txb,
  }
}
