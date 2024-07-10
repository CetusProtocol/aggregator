import { Transaction } from "@mysten/sui/transactions"
import { SwapInPoolsParams } from "~/client"
import { AggregatorConfig } from "~/config"
import { compareCoins, completionCoin } from "~/utils/coin"
import {
  CETUS_DEX,
  INTEGRATE,
  RouterData,
  SwapInPoolsResult,
  U64_MAX_BN,
  ZERO,
} from ".."
import { ConfigErrorCode, TransactionErrorCode } from "~/errors"
import { checkInvalidSuiAddress } from "~/utils/transaction"
import { SuiClient } from "@mysten/sui/client"
import { BN } from "bn.js"
import { sqrtPriceX64ToPrice } from "~/math"

export async function swapInPools(
  client: SuiClient,
  params: SwapInPoolsParams,
  config: AggregatorConfig
): Promise<SwapInPoolsResult> {
  const { from, target, amount, byAmountIn, pools } = params
  const fromCoin = completionCoin(from)
  const targetCoin = completionCoin(target)

  const tx = new Transaction()
  const a2b = compareCoins(fromCoin, targetCoin)

  const integratePackage = config.getPackage(INTEGRATE)
  if (integratePackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const integratePublishedAt = integratePackage.publishedAt

  const coinA = a2b ? fromCoin : targetCoin
  const coinB = a2b ? targetCoin : fromCoin

  const typeArguments = [coinA, coinB]
  for (let i = 0; i < pools.length; i++) {
    const args = [
      tx.object(pools[i]),
      tx.pure.bool(a2b),
      tx.pure.bool(byAmountIn),
      tx.pure.u64(amount.toString()),
    ]
    tx.moveCall({
      target: `${integratePublishedAt}::fetcher_script::calculate_swap_result`,
      arguments: args,
      typeArguments,
    })
  }

  if (!checkInvalidSuiAddress(config.getWallet())) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.InvalidWallet
    )
  }

  const simulateRes = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: config.getWallet(),
  })
  if (simulateRes.error != null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.SimulateError
    )
  }

  const valueData: any = simulateRes.events?.filter((item: any) => {
    return item.type.includes("CalculatedSwapResultEvent")
  })

  if (valueData.length === 0 || valueData.length !== pools.length) {
    throw new AggregateError(
      "Simulate event result error",
      TransactionErrorCode.SimulateEventError
    )
  }

  let tempMaxAmount = byAmountIn ? ZERO : U64_MAX_BN
  let tempIndex = 0
  for (let i = 0; i < valueData.length; i += 1) {
    if (valueData[i].parsedJson.data.is_exceed) {
      continue
    }

    if (params.byAmountIn) {
      const amount = new BN(valueData[i].parsedJson.data.amount_out)
      if (amount.gt(tempMaxAmount)) {
        tempIndex = i
        tempMaxAmount = amount
      }
    } else {
      const amount = new BN(valueData[i].parsedJson.data.amount_out)
      if (amount.lt(tempMaxAmount)) {
        tempIndex = i
        tempMaxAmount = amount
      }
    }
  }

  const event = valueData[tempIndex].parsedJson.data
  const currentSqrtPrice = event.step_results[0].current_sqrt_price

  const [decimalA, decimalB] = await Promise.all([
    client
      .getCoinMetadata({ coinType: coinA })
      .then((metadata) => metadata?.decimals),
    client
      .getCoinMetadata({ coinType: coinB })
      .then((metadata) => metadata?.decimals),
  ])

  if (decimalA == null || decimalB == null) {
    throw new AggregateError(
      "Simulate event result error",
      TransactionErrorCode.CannotGetDecimals
    )
  }
  const initialPrice = sqrtPriceX64ToPrice(
    currentSqrtPrice,
    decimalA!,
    decimalB!
  )

  const routeData = {
    amountIn: new BN(event.amount_in ?? 0),
    amountOut: new BN(event.amount_out ?? 0),
    routes: [
      {
        path: [
          {
            id: pools[tempIndex],
            a2b,
            provider: CETUS_DEX,
            from: fromCoin,
            target: targetCoin,
            feeRate: 0,
            amountIn: 0,
            amountOut: 0,
          },
        ],
        amountIn: new BN(event.amount_in ?? 0),
        amountOut: new BN(event.amount_out ?? 0),
        initialPrice,
      },
    ],
  }

  const result = {
    isExceed: event.is_exceed,
    routeData,
  }

  return result
}
