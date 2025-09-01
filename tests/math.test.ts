import BN from "bn.js"
import { CalculateAmountLimitBN, sqrtPriceX64ToPrice } from "~/math"

describe("test math functions", () => {
  test("test sqrt price x64 to price", () => {
    const sqrtPriceStr = "1312674575678912631"
    const decimalsA = 9
    const decimalsB = 6

    const price = sqrtPriceX64ToPrice(sqrtPriceStr, decimalsA, decimalsB)
    console.log("price", price.toFixed(9))
  })

  test("calculate amount limit", () => {
    const amount = new BN(107738590)
    const byAmountIn = true

    const amountLimit = CalculateAmountLimitBN(amount, byAmountIn, 0.01)
    console.log("amount limit", amountLimit.toString())
  })
})
