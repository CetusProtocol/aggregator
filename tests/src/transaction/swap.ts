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
    "0x2d8c2e0fc6dd25b0214b3fa747e0fd27fd54608142cd2e4f64c1cd350cc4add4" :
    "0x4f920e1ef6318cfba77e20a0538a419a5a504c14230169438b99aba485db40a6"
  const coinA = direction ? fromCoin : targetCoin
  const coinB = direction ? targetCoin : fromCoin

  const typeArguments = [coinA, coinB]

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

  const feeRate = Number(event.fee_rate) / 1000000
  const pureAmountIn = new BN(event.amount_in ?? 0)
  const feeAmount = new BN(event.fee_amount ?? 0)
  const amountIn = pureAmountIn.add(feeAmount)

  const routeData = {
    amountIn: amountIn,
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
            feeRate,
            amountIn: event.amount_in,
            amountOut: event.amount_out,
            extendedDetails: {
              afterSqrtPrice: event.after_sqrt_price,
            },
          },
        ],
        amountIn: amountIn,
        amountOut: new BN(event.amount_out ?? 0),
        initialPrice,
      },
    ],
    insufficientLiquidity: false,
    byAmountIn: params.byAmountIn,
  }

  const result = {
    isExceed: event.is_exceed,
    routeData,
  }

  return result
}
