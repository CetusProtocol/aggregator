import { CoinAsset } from "../types/sui"
import { CoinUtils } from "../types/CoinAssist"
import { TransactionErrorCode } from "../errors"
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"

export function completionCoin(s: string): string {
  const index = s.indexOf("::")
  if (index === -1) {
    return s
  }
  const prefix = s.substring(0, index)
  const rest = s.substring(index)
  if (!prefix.startsWith("0x")) {
    return s
  }
  const hexStr = prefix.substring(2)
  if (hexStr.length > 64) {
    return s
  }
  const paddedHexStr = hexStr.padStart(64, "0")
  return `0x${paddedHexStr}${rest}`
}

export function compareCoins(coinA: string, coinB: string): boolean {
  coinA = completionCoin(coinA)
  coinB = completionCoin(coinB)
  const minLength = Math.min(coinA.length, coinB.length)

  for (let i = 0; i < minLength; i++) {
    if (coinA[i] > coinB[i]) {
      return true
    } else if (coinA[i] < coinB[i]) {
      return false
    }
  }

  // If both strings are the same length and all characters are equal
  return true // or coinB, they are equal
}

export function mintZeroCoin(
  txb: Transaction,
  coinType: string
): TransactionObjectArgument {
  return txb.moveCall({
    target: "0x2::coin::zero",
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

  let totalCoinBalance = CoinUtils.calculateTotalBalance(usedCoinAsests)
  if (totalCoinBalance < amount) {
    throw new AggregateError(
      "Insufficient balance when build merge coin, coinType: " + coinType,
      TransactionErrorCode.InsufficientBalance  + coinType
    )
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
