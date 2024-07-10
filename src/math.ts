// Calculate amount limit.
// If byAmountIn is true, the expectAmount means amountOut, otherwise means amountIn.
// `byAmountIn` means fixed amount in or out.

import BN from "bn.js"
import { ZERO } from "./const"
import Decimal from "decimal.js"

// `slippage` is a percentage, for example, 0.01 means 1%.
export function CalculateAmountLimit(expectAmount: BN, byAmountIn: boolean, slippage: number): number {
  let amountLimit = ZERO
  if (byAmountIn) {
    amountLimit = expectAmount.muln(1 - slippage)
  } else {
    amountLimit = expectAmount.muln(1 + slippage)
  }

  return Number(amountLimit.toString())
}

const MAX_SQER_PRICE_X64 = '79226673515401279992447579055'
const MIN_SQER_PRICE_X64 = '4295048016'

export function GetDefaultSqrtPriceLimit(a2b: boolean): BN {
  if (a2b) {
    return new BN(MIN_SQER_PRICE_X64)
  } else {
      return new BN(MAX_SQER_PRICE_X64)
  }
}

export function sqrtPriceX64ToPrice(sqrtPriceStr: string, decimalsA: number, decimalsB: number): Decimal {
  const sqrtPriceX64 = new Decimal(sqrtPriceStr).mul(Decimal.pow(2, -64))
  return sqrtPriceX64
    .pow(2)
    .mul(Decimal.pow(10, decimalsA - decimalsB))
}
