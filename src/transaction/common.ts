import {
  AGGREGATOR,
  CHECK_COINS_THRESHOLD_FUNC,
  JOIN_FUNC,
  PAY_MODULE,
  SuiZeroCoinFn,
  TRANSFER_OR_DESTORY_COIN_FUNC,
  UTILS_MODULE,
} from "../const"
import { CoinAsset } from "../types/sui"
import { CoinUtils } from "../types/CoinAssist"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import { createTarget } from "../utils"
import { AggregatorConfig } from "../config"
import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { SUI_FRAMEWORK_ADDRESS } from "@mysten/sui/utils"

export function mintZeroCoin(
  txb: Transaction,
  coinType: string
): TransactionObjectArgument {
  return txb.moveCall({
    target: SuiZeroCoinFn,
    typeArguments: [coinType],
  })
}

export type BuildCoinResult = {
  targetCoin: TransactionObjectArgument
  isMintZeroCoin: boolean
  targetCoinAmount: number
}

export function buildInputCoin(
  txb: Transaction,
  allCoins: CoinAsset[],
  amount: bigint,
  coinType: string
): BuildCoinResult {
  const usedCoinAsests = CoinUtils.getCoinAssets(coinType, allCoins)
  if (amount === BigInt(0) && usedCoinAsests.length === 0) {
    const zeroCoin = mintZeroCoin(txb, coinType)
    return {
      targetCoin: zeroCoin,
      isMintZeroCoin: true,
      targetCoinAmount: 0,
    }
  }

  if (CoinUtils.isSuiCoin(coinType)) {
    const resultCoin = txb.splitCoins(txb.gas, [
      txb.pure.u64(amount.toString()),
    ])
    return {
      targetCoin: resultCoin,
      isMintZeroCoin: true,
      targetCoinAmount: Number(amount.toString()),
    }
  }

  let totalCoinBalance = CoinUtils.calculateTotalBalance(usedCoinAsests)
  if (totalCoinBalance < amount) {
    throw new AggregateError(
      "Insufficient balance when build merge coin",
      TransactionErrorCode.InsufficientBalance
    )
  }

  // sort used coin by amount, asc
  let sortCoinAssets = CoinUtils.sortByBalance(usedCoinAsests)

  // find first three coin if greater than amount
  let totalThreeCoinBalance = sortCoinAssets
    .slice(0, 3)
    .reduce((acc, coin) => acc + coin.balance, BigInt(0))
  if (totalThreeCoinBalance < BigInt(amount)) {
    sortCoinAssets = CoinUtils.sortByBalanceDes(usedCoinAsests)
  }

  let selectedCoinResult = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(
    sortCoinAssets,
    amount
  )
  const [masterCoin, ...mergedCoin] = selectedCoinResult.objectArray

  if (mergedCoin.length > 0) {
    txb.mergeCoins(
      masterCoin,
      mergedCoin.map((coin) => txb.object(coin))
    )
  }

  return {
    targetCoin: txb.object(masterCoin),
    isMintZeroCoin: false,
    targetCoinAmount: Number(amount.toString()),
  }
}

export function transferOrDestoryCoin(
  txb: Transaction,
  coinObject: TransactionObjectArgument,
  coinType: string,
  config: AggregatorConfig
) {
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  txb.moveCall({
    target: createTarget(
      aggregatorPublishedAt,
      UTILS_MODULE,
      TRANSFER_OR_DESTORY_COIN_FUNC
    ),
    typeArguments: [coinType],
    arguments: [coinObject],
  })
}

export function checkCoinThresholdAndMergeCoin(
  txb: Transaction,
  coins: TransactionObjectArgument[],
  coinType: string,
  amountLimit: number,
  config: AggregatorConfig
): TransactionArgument {
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  const vec = txb.makeMoveVec({
    elements: coins,
  })

  txb.moveCall({
    target: createTarget(
      aggregatorPublishedAt,
      UTILS_MODULE,
      CHECK_COINS_THRESHOLD_FUNC
    ),
    typeArguments: [coinType],
    arguments: [vec, txb.pure.u64(amountLimit)],
  })

  const zeroCoin = mintZeroCoin(txb, coinType)

  txb.moveCall({
    target: createTarget(SUI_FRAMEWORK_ADDRESS, PAY_MODULE, JOIN_FUNC),
    typeArguments: [coinType],
    arguments: [zeroCoin, vec],
  })

  return zeroCoin
}
