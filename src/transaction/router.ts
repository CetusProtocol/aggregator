import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import type { BuildRouterSwapParams } from "../client"
import { AggregatorConfig } from "../config"
import {
  AFTERMATH_AMM,
  CETUS_DEX,
  DEEPBOOK_DEX,
  FLOWX_AMM,
  KRIYA_DEX,
  TURBOS_DEX,
  U64_MAX,
} from "../const"
import { deepbookSwapMovecall } from "./deepbook"
import { SuiClient } from "@mysten/sui/client"
import { kriyaSwapMovecall } from "./kriya"
import {
  cetusFlashSwapMovecall,
  cetusRepayFlashSwapMovecall,
  cetusSwapWithOutLimit,
} from "./cetus"
import { transferOrDestoryCoin } from "./common"
import { GetDefaultSqrtPriceLimit } from "../math"
import { flowxAmmSwapMovecall } from "./flowx"
import { turbosSwapMovecall } from "./turbos"
import { parseAftermathFeeType, parseTurbosPoolFeeType } from "~/utils/coin"
import { AftermathAmmSwapMovecall } from "./aftermath"
import { TransactionErrorCode } from "~/errors"

export async function expectInputRouterSwap(
  client: SuiClient,
  params: BuildRouterSwapParams,
  txb: Transaction,
  fromCoin: TransactionObjectArgument,
  config: AggregatorConfig,
  partner?: string
): Promise<TransactionObjectArgument[]> {
  const splitAmounts = params.routers.map((router) =>
    router.amountIn.toString()
  )
  const targetCoins = []
  const fromCoins = txb.splitCoins(fromCoin, splitAmounts)

  for (let i = 0; i < params.routers.length; i++) {
    const router = params.routers[i]
    let intermediateTargetCoin: TransactionObjectArgument
    let nextFromCoin = fromCoins[i] as TransactionObjectArgument

    let nextFlashAmount: TransactionArgument = txb.pure.u64(splitAmounts[i])

    for (let j = 0; j < router.path.length; j++) {
      const firstPathPool = j === 0
      const path = router.path[j]

      if (path.provider === CETUS_DEX) {
        const swapParams = {
          poolId: path.id,
          amount: nextFlashAmount,
          amountLimit: "0",
          a2b: path.a2b,
          byAmountIn: true,
          sqrtPriceLimit: GetDefaultSqrtPriceLimit(path.a2b),
          partner: partner!,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? path.target : path.from,
        }

        const returnPayAmount = firstPathPool && router.path.length > 1
        const swapResult = await cetusSwapWithOutLimit(
          swapParams,
          nextFromCoin,
          txb,
          config,
          returnPayAmount
        )

        transferOrDestoryCoin(
          txb,
          swapResult.repayTargetCoin,
          path.from,
          config
        )

        intermediateTargetCoin = swapResult.flashTargetCoin!
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = returnPayAmount
          ? swapResult.nextInputAmount!
          : txb.pure.u64(0)
      }

      if (path.provider === DEEPBOOK_DEX) {
        const coinA = path.a2b ? nextFromCoin : undefined
        const coinB = path.a2b ? undefined : nextFromCoin

        const swapParams = {
          poolId: path.id,
          a2b: path.a2b,
          amount: nextFlashAmount,
          amountLimit: 0,
          coinA,
          coinB,
          useFullInputCoinAmount: !firstPathPool,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? params.targetCoinType : path.from,
        }
        const deepbookSwapResult = await deepbookSwapMovecall(
          swapParams,
          client,
          txb,
          config
        )

        intermediateTargetCoin = deepbookSwapResult.targetCoin
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = deepbookSwapResult.amountOut
      }

      if (path.provider === KRIYA_DEX) {
        const coinA = path.a2b ? nextFromCoin : undefined
        const coinB = path.a2b ? undefined : nextFromCoin

        const swapParams = {
          poolId: path.id,
          amount: nextFlashAmount,
          amountLimit: 0,
          a2b: path.a2b,
          byAmountIn: true,
          coinA,
          coinB,
          useFullInputCoinAmount: !firstPathPool,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? path.target : path.from,
        }

        const swapResult = await kriyaSwapMovecall(swapParams, txb, config)

        intermediateTargetCoin = swapResult.targetCoin
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = swapResult.amountOut
      }

      if (path.provider === FLOWX_AMM) {
        const coinA = path.a2b ? nextFromCoin : undefined
        const coinB = path.a2b ? undefined : nextFromCoin

        const swapParams = {
          amount: nextFlashAmount,
          amountLimit: 0,
          a2b: path.a2b,
          byAmountIn: true,
          coinA,
          coinB,
          useFullInputCoinAmount: !firstPathPool,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? path.target : path.from,
        }

        const swapResult = await flowxAmmSwapMovecall(swapParams, txb, config)

        intermediateTargetCoin = swapResult.targetCoin
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = swapResult.amountOut
      }

      if (path.provider === TURBOS_DEX) {
        const coinA = path.a2b ? nextFromCoin : undefined
        const coinB = path.a2b ? undefined : nextFromCoin

        let feeType = ""
        if (
          path.extendedDetails != null &&
          path.extendedDetails.turbosFeeType != null
        ) {
          feeType = path.extendedDetails.turbosFeeType
        } else {
          throw new AggregateError(
            "Build turbos swap movecall error: ",
            TransactionErrorCode.MissTurbosFeeType
          )
        }

        const swapParams = {
          poolId: path.id,
          amount: nextFlashAmount,
          amountLimit: 0,
          a2b: path.a2b,
          byAmountIn: true,
          coinA,
          coinB,
          useFullInputCoinAmount: !firstPathPool,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? path.target : path.from,
          feeType,
        }

        const swapResult = await turbosSwapMovecall(swapParams, txb, config)

        intermediateTargetCoin = swapResult.targetCoin
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = swapResult.amountOut
      }

      if (path.provider === AFTERMATH_AMM) {
        const coinA = path.a2b ? nextFromCoin : undefined
        const coinB = path.a2b ? undefined : nextFromCoin

        let lpSupplyType = ""

        if (
          path.extendedDetails != null &&
          path.extendedDetails.aftermathLpSupplyType != null
        ) {
          lpSupplyType = path.extendedDetails.aftermathLpSupplyType
        } else {
          throw new AggregateError(
            "Build aftermath swap movecall error: ",
            TransactionErrorCode.MissAftermathLpSupplyType
          )
        }

        const swapParams = {
          poolId: path.id,
          amount: nextFlashAmount,
          amountOut: path.amountOut,
          amountLimit: 0,
          a2b: path.a2b,
          byAmountIn: true,
          coinA,
          coinB,
          useFullInputCoinAmount: !firstPathPool,
          coinAType: path.a2b ? path.from : path.target,
          coinBType: path.a2b ? path.target : path.from,
          slippage: params.slippage,
          lpSupplyType,
        }

        const swapResult = await AftermathAmmSwapMovecall(
          swapParams,
          txb,
          config
        )

        intermediateTargetCoin = swapResult.targetCoin
        nextFromCoin = intermediateTargetCoin
        nextFlashAmount = swapResult.amountOut
      }
    }
    targetCoins.push(nextFromCoin)
  }

  transferOrDestoryCoin(txb, fromCoin, params.fromCoinType, config)

  return targetCoins
}

export async function expectOutputRouterSwap(
  params: BuildRouterSwapParams,
  txb: Transaction,
  fromCoin: TransactionObjectArgument,
  config: AggregatorConfig,
  partner?: string
): Promise<TransactionObjectArgument[]> {
  const splitAmounts = params.routers.map((router) =>
    router.amountOut.toString()
  )

  const returnCoins: TransactionObjectArgument[] = []
  const receipts: TransactionObjectArgument[] = []

  const targetCoins = []

  for (let i = 0; i < params.routers.length; i++) {
    const router = params.routers[i]

    let nextFlashAmount: TransactionArgument = txb.pure.u64(splitAmounts[i])
    for (let j = router.path.length - 1; j >= 0; j--) {
      const path = router.path[j]

      const coinAType = path.a2b ? path.from : path.target
      const coinBType = path.a2b ? path.target : path.from

      const swapParams = {
        poolId: path.id,
        amount: nextFlashAmount,
        amountLimit: U64_MAX,
        a2b: path.a2b,
        byAmountIn: false,
        sqrtPriceLimit: GetDefaultSqrtPriceLimit(path.a2b), //
        partner,
        coinAType,
        coinBType,
      }

      const flashSwapResult = cetusFlashSwapMovecall(swapParams, txb, config)
      nextFlashAmount = flashSwapResult.payAmount
      returnCoins.unshift(flashSwapResult.targetCoin)
      receipts.unshift(flashSwapResult.flashReceipt)
    }

    let nextRepayCoin = fromCoin
    for (let j = 0; j < router.path.length; j++) {
      const path = router.path[j]

      const coinAType = path.a2b ? path.from : path.target
      const coinBType = path.a2b ? path.target : path.from

      const repayParams = {
        poolId: path.id,
        a2b: path.a2b,
        partner: partner,
        coinA: path.a2b ? nextRepayCoin : undefined,
        coinB: path.a2b ? undefined : nextRepayCoin,
        receipt: receipts[j],
        coinAType,
        coinBType,
      }
      const repayResult = await cetusRepayFlashSwapMovecall(
        repayParams,
        txb,
        config
      )
      nextRepayCoin = returnCoins[j]
      if (j === 0) {
        fromCoin = repayResult.repayTargetCoin
      } else {
        transferOrDestoryCoin(
          txb,
          repayResult.repayTargetCoin,
          path.from,
          config
        )
      }
      if (j === router.path.length - 1) {
        targetCoins.push(nextRepayCoin)
      }
    }
  }

  transferOrDestoryCoin(txb, fromCoin, params.fromCoinType, config)

  return targetCoins
}
