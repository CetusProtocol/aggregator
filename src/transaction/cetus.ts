import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorConfig, ENV } from "../config"
import {
  AGGREGATOR,
  CLOCK_ADDRESS,
  CETUS_MODULE,
  FlashSwapA2BFunc,
  MAINNET_CETUS_GLOBAL_CONFIG_ID,
  TESTNET_CETUS_GLOBAL_CONFIG_ID,
  FlashSwapWithPartnerA2BFunc,
  FlashSwapWithPartnerB2AFunc,
  FlashSwapB2AFunc,
  REPAY_FLASH_SWAP_WITH_PARTNER_A2B_FUNC,
  REPAY_FLASH_SWAP_WITH_PARTNER_B2A_FUNC,
  REPAY_FLASH_SWAP_A2B_FUNC,
  REPAY_FLASH_SWAP_B2A_FUNC,
} from "../const"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import BN from "bn.js"
import { createTarget } from "../utils"

export type CetusSwapParams = {
  poolId: string
  amount: TransactionArgument
  amountLimit: string
  a2b: boolean
  byAmountIn: boolean
  sqrtPriceLimit: BN
  partner?: string
  coinAType: string
  coinBType: string
}

export type CetusFlashSwapResult = {
  targetCoin: TransactionObjectArgument
  flashReceipt: TransactionObjectArgument
  payAmount: TransactionArgument
  swapedAmount: TransactionArgument
  txb: Transaction
}

export function cetusFlashSwapMovecall(
  swapParams: CetusSwapParams,
  txb: Transaction,
  config: AggregatorConfig
): CetusFlashSwapResult {
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  const globalConfigId =
    config.getENV() === ENV.MAINNET
      ? MAINNET_CETUS_GLOBAL_CONFIG_ID
      : TESTNET_CETUS_GLOBAL_CONFIG_ID

  const hasPartner = swapParams.partner != null && swapParams.partner.length > 0

  const args = hasPartner
    ? [
        txb.object(globalConfigId),
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        txb.pure.bool(swapParams.byAmountIn),
        txb.pure.u128(swapParams.sqrtPriceLimit.toString()),
        txb.object(swapParams.partner!.toString()),
        txb.object(CLOCK_ADDRESS),
      ]
    : [
        txb.object(globalConfigId),
        txb.object(swapParams.poolId),
        swapParams.amount,
        txb.pure.u64(swapParams.amountLimit),
        txb.pure.bool(swapParams.byAmountIn),
        txb.pure.u128(swapParams.sqrtPriceLimit.toString()),
        txb.object(CLOCK_ADDRESS),
      ]

  let func
  if (hasPartner) {
    if (swapParams.a2b) {
      func = FlashSwapWithPartnerA2BFunc
    } else {
      func = FlashSwapWithPartnerB2AFunc
    }
  } else {
    if (swapParams.a2b) {
      func = FlashSwapA2BFunc
    } else {
      func = FlashSwapB2AFunc
    }
  }

  const target = createTarget(aggregatorPublishedAt, CETUS_MODULE, func)

  const moveCallRes = txb.moveCall({
    target,
    typeArguments: [swapParams.coinAType, swapParams.coinBType],
    arguments: args,
  })

  return {
    targetCoin: moveCallRes[0],
    flashReceipt: moveCallRes[1],
    payAmount: moveCallRes[2],
    swapedAmount: moveCallRes[3],
    txb,
  }
}

export type repayParams = {
  poolId: string
  a2b: boolean
  coinA?: TransactionObjectArgument
  coinB?: TransactionObjectArgument
  receipt: TransactionObjectArgument
  coinAType: string
  coinBType: string
  partner?: string
}

export type SwapResult = {
  repayTargetCoin: TransactionObjectArgument
  flashTargetCoin?: TransactionObjectArgument
  nextInputAmount?: TransactionArgument
}

export async function cetusRepayFlashSwapMovecall(
  repayParams: repayParams,
  txb: Transaction,
  config: AggregatorConfig
): Promise<SwapResult> {
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  const globalConfigId =
    config.getENV() === ENV.MAINNET
      ? MAINNET_CETUS_GLOBAL_CONFIG_ID
      : TESTNET_CETUS_GLOBAL_CONFIG_ID

  const hasPartner =
    repayParams.partner != null && repayParams.partner.length > 0

  if (repayParams.a2b) {
    if (repayParams.coinA == null) {
      throw new AggregateError(
        "coinA is required",
        TransactionErrorCode.MissCoinA
      )
    }
  } else {
    if (repayParams.coinB == null) {
      throw new AggregateError(
        "coinB is required",
        TransactionErrorCode.MissCoinB
      )
    }
  }

  let args
  if (hasPartner) {
    if (repayParams.a2b) {
      args = [
        txb.object(globalConfigId),
        txb.object(repayParams.poolId),
        repayParams.coinA!,
        repayParams.receipt,
        txb.object(repayParams.partner!),
      ]
    } else {
      args = [
        txb.object(globalConfigId),
        txb.object(repayParams.poolId),
        repayParams.coinB!,
        repayParams.receipt,
        txb.object(repayParams.partner!),
      ]
    }
  } else {
    if (repayParams.a2b) {
      args = [
        txb.object(globalConfigId),
        txb.object(repayParams.poolId),
        repayParams.coinA!,
        repayParams.receipt,
      ]
    } else {
      args = [
        txb.object(globalConfigId),
        txb.object(repayParams.poolId),
        repayParams.coinB!,
        repayParams.receipt,
      ]
    }
  }

  let func
  if (hasPartner) {
    if (repayParams.a2b) {
      func = REPAY_FLASH_SWAP_WITH_PARTNER_A2B_FUNC
    } else {
      func = REPAY_FLASH_SWAP_WITH_PARTNER_B2A_FUNC
    }
  } else {
    if (repayParams.a2b) {
      func = REPAY_FLASH_SWAP_A2B_FUNC
    } else {
      func = REPAY_FLASH_SWAP_B2A_FUNC
    }
  }

  const target = createTarget(aggregatorPublishedAt, CETUS_MODULE, func)

  const res: TransactionObjectArgument[] = txb.moveCall({
    target,
    typeArguments: [repayParams.coinAType, repayParams.coinBType],
    arguments: args,
  })

  return {
    repayTargetCoin: res[0],
  }
}

export async function cetusSwapWithOutLimit(
  swapParams: CetusSwapParams,
  fromCoin: TransactionObjectArgument,
  txb: Transaction,
  config: AggregatorConfig,
  returnPayAmount: boolean
): Promise<SwapResult> {
  const flashResult = cetusFlashSwapMovecall(swapParams, txb, config)

  const repayCoinA = swapParams.a2b ? fromCoin : undefined
  const repayCoinB = swapParams.a2b ? undefined : fromCoin

  const repayParams = {
    poolId: swapParams.poolId,
    a2b: swapParams.a2b,
    coinA: repayCoinA,
    coinB: repayCoinB,
    receipt: flashResult.flashReceipt,
    coinAType: swapParams.coinAType,
    coinBType: swapParams.coinBType,
    partner: swapParams.partner,
  }

  let nextInputAmount: TransactionArgument

  if (returnPayAmount && swapParams.byAmountIn) {
    nextInputAmount = flashResult.swapedAmount
  } else {
    nextInputAmount = flashResult.payAmount
  }

  const repayResult = await cetusRepayFlashSwapMovecall(
    repayParams,
    txb,
    config
  )

  return {
    flashTargetCoin: flashResult.targetCoin,
    repayTargetCoin: repayResult.repayTargetCoin,
    nextInputAmount,
  }
}
