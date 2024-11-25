import { Transaction } from "@mysten/sui/transactions"
import { SwapInPoolsParams } from "~/client"
import { compareCoins, completionCoin } from "~/utils/coin"
import { Env, SwapInPoolsResult, U64_MAX_BN, ZERO } from ".."
import { ConfigErrorCode, TransactionErrorCode } from "~/errors"
import { checkInvalidSuiAddress, printTransaction } from "~/utils/transaction"
import { SuiClient } from "@mysten/sui/client"
import { BN } from "bn.js"
import { sqrtPriceX64ToPrice } from "~/math"

export async function swapInPools(
  client: SuiClient,
  params: SwapInPoolsParams,
  sender: string,
  env: Env
): Promise<SwapInPoolsResult> {
  const { from, target, amount, byAmountIn, pools } = params
  const fromCoin = completionCoin(from)
  const targetCoin = completionCoin(target)

  const tx = new Transaction()
  const direction = compareCoins(fromCoin, targetCoin)
  const integratePublishedAt = env === Env.Mainnet ?
    "0x3a5aa90ffa33d09100d7b6941ea1c0ffe6ab66e77062ddd26320c1b073aabb10" :
    "0x19dd42e05fa6c9988a60d30686ee3feb776672b5547e328d6dab16563da65293"
  const coinA = direction ? fromCoin : targetCoin
  const coinB = direction ? targetCoin : fromCoin

  const typeArguments = [coinA, coinB]
  console.log("typeArguments", typeArguments, integratePublishedAt)

  for (let i = 0; i < pools.length; i++) {
    const args = [
      tx.object(pools[i]),
      tx.pure.bool(direction),
      tx.pure.bool(byAmountIn),
      tx.pure.u64(amount.toString()),
    ]
    tx.moveCall({
      target: `${integratePublishedAt}::fetcher_script::calculate_swap_result`,
      arguments: args,
      typeArguments,
    })
  }

  if (!checkInvalidSuiAddress(sender)) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.InvalidWallet
    )
  }

  printTransaction(tx)

  const simulateRes = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender,
  })
  if (simulateRes.error != null) {
    console.log("simulateRes.error", simulateRes.error)
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
            direction,
            provider: "CETUS",
            from: fromCoin,
            target: targetCoin,
            feeRate: event.fee_rate,
            amountIn: event.amount_in,
            amountOut: event.amount_out,
            extendedDetails: {
              afterSqrtPrice: event.after_sqrt_price,
            },
          },
        ],
        amountIn: new BN(event.amount_in ?? 0),
        amountOut: new BN(event.amount_out ?? 0),
        initialPrice,
      },
    ],
    insufficientLiquidity: false,
  }

  const result = {
    isExceed: event.is_exceed,
    routeData,
  }

  return result
}
