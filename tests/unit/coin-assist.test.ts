import { describe, test, expect } from "vitest"
import { CoinUtils, GAS_TYPE_ARG, GAS_TYPE_ARG_LONG, type SuiMoveObject } from "~/types/CoinAssist"
import type { CoinAsset } from "~/types/sui"

function makeCoinObject(type: string, balance: string = "1000000000", id: string = "0x1"): SuiMoveObject {
  return {
    type,
    fields: { balance, id: { id } },
  }
}

function makeCoinAsset(coinAddress: string, balance: bigint, coinObjectId: string): CoinAsset {
  return { coinAddress, coinObjectId, balance }
}

describe("CoinUtils", () => {
  describe("getCoinTypeArg", () => {
    test("extracts type arg from standard coin type", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0x2::sui::SUI>")
      expect(CoinUtils.getCoinTypeArg(obj)).toBe("0x2::sui::SUI")
    })

    test("extracts type arg from custom coin type", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0xdba34672::usdc::USDC>")
      expect(CoinUtils.getCoinTypeArg(obj)).toBe("0xdba34672::usdc::USDC")
    })

    test("returns null for non-coin type", () => {
      const obj = makeCoinObject("0x2::nft::NFT")
      expect(CoinUtils.getCoinTypeArg(obj)).toBeNull()
    })
  })

  describe("isSUI", () => {
    test("returns true for SUI coin", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0x2::sui::SUI>")
      expect(CoinUtils.isSUI(obj)).toBe(true)
    })

    test("returns false for non-SUI coin", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0xabc::usdc::USDC>")
      expect(CoinUtils.isSUI(obj)).toBe(false)
    })
  })

  describe("getCoinSymbol", () => {
    test("extracts symbol from coin type", () => {
      expect(CoinUtils.getCoinSymbol("0x2::sui::SUI")).toBe("SUI")
      expect(CoinUtils.getCoinSymbol("0xdba::usdc::USDC")).toBe("USDC")
    })
  })

  describe("getBalance", () => {
    test("returns balance as bigint", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0x2::sui::SUI>", "5000000000")
      expect(CoinUtils.getBalance(obj)).toBe(BigInt("5000000000"))
    })
  })

  describe("getID", () => {
    test("returns object ID", () => {
      const obj = makeCoinObject("0x2::coin::Coin<0x2::sui::SUI>", "100", "0xabc123")
      expect(CoinUtils.getID(obj)).toBe("0xabc123")
    })
  })

  describe("getCoinTypeFromArg", () => {
    test("wraps type arg in Coin<>", () => {
      expect(CoinUtils.getCoinTypeFromArg("0x2::sui::SUI")).toBe(
        "0x2::coin::Coin<0x2::sui::SUI>"
      )
    })
  })

  describe("isSuiCoin", () => {
    test("returns true for SUI address", () => {
      expect(CoinUtils.isSuiCoin(GAS_TYPE_ARG)).toBe(true)
    })

    test("returns true for long SUI address", () => {
      expect(CoinUtils.isSuiCoin(GAS_TYPE_ARG_LONG)).toBe(true)
    })

    test("returns false for non-SUI address", () => {
      expect(CoinUtils.isSuiCoin("0xdba::usdc::USDC")).toBe(false)
    })
  })

  describe("totalBalance", () => {
    test("sums balances for matching coin address", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("0x2::sui::SUI", BigInt(100), "0x1"),
        makeCoinAsset("0x2::sui::SUI", BigInt(200), "0x2"),
        makeCoinAsset("0xabc::usdc::USDC", BigInt(500), "0x3"),
      ]
      expect(CoinUtils.totalBalance(coins, "0x2::sui::SUI")).toBe(BigInt(300))
    })

    test("returns 0 when no matching coins", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("0x2::sui::SUI", BigInt(100), "0x1"),
      ]
      expect(CoinUtils.totalBalance(coins, "0xabc::usdc::USDC")).toBe(BigInt(0))
    })
  })

  describe("calculateTotalBalance", () => {
    test("sums all coin balances", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("0x2::sui::SUI", BigInt(100), "0x1"),
        makeCoinAsset("0x2::sui::SUI", BigInt(250), "0x2"),
        makeCoinAsset("0x2::sui::SUI", BigInt(50), "0x3"),
      ]
      expect(CoinUtils.calculateTotalBalance(coins)).toBe(BigInt(400))
    })

    test("returns 0 for empty array", () => {
      expect(CoinUtils.calculateTotalBalance([])).toBe(BigInt(0))
    })
  })

  describe("sortByBalance", () => {
    test("sorts coins ascending by balance", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(300), "0x3"),
        makeCoinAsset("SUI", BigInt(100), "0x1"),
        makeCoinAsset("SUI", BigInt(200), "0x2"),
      ]
      const sorted = CoinUtils.sortByBalance(coins)
      expect(sorted[0].balance).toBe(BigInt(100))
      expect(sorted[1].balance).toBe(BigInt(200))
      expect(sorted[2].balance).toBe(BigInt(300))
    })
  })

  describe("selectCoinObjectIdGreaterThanOrEqual", () => {
    test("selects smallest sufficient single coin", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(100), "0x1"),
        makeCoinAsset("SUI", BigInt(500), "0x2"),
        makeCoinAsset("SUI", BigInt(1000), "0x3"),
      ]

      const result = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(coins, BigInt(400))
      expect(result.objectArray).toContain("0x2")
      expect(result.objectArray).toHaveLength(1)
    })

    test("combines multiple coins when no single coin is sufficient", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(100), "0x1"),
        makeCoinAsset("SUI", BigInt(200), "0x2"),
        makeCoinAsset("SUI", BigInt(300), "0x3"),
      ]

      const result = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(coins, BigInt(500))
      const totalSelected = result.amountArray.reduce((sum, a) => sum + BigInt(a), BigInt(0))
      expect(totalSelected).toBeGreaterThanOrEqual(BigInt(500))
    })

    test("returns empty when total balance is insufficient", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(100), "0x1"),
        makeCoinAsset("SUI", BigInt(200), "0x2"),
      ]

      const result = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(coins, BigInt(500))
      expect(result.objectArray).toHaveLength(0)
    })

    test("excludes specified coin IDs", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(1000), "0x1"),
        makeCoinAsset("SUI", BigInt(500), "0x2"),
      ]

      const result = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(coins, BigInt(800), ["0x1"])
      // Should not include 0x1, and 0x2 alone is insufficient
      expect(result.objectArray).not.toContain("0x1")
    })

    test("selects all coins when total equals amount", () => {
      const coins: CoinAsset[] = [
        makeCoinAsset("SUI", BigInt(300), "0x1"),
        makeCoinAsset("SUI", BigInt(200), "0x2"),
      ]

      const result = CoinUtils.selectCoinObjectIdGreaterThanOrEqual(coins, BigInt(500))
      expect(result.objectArray).toHaveLength(2)
      expect(result.remainCoins).toHaveLength(0)
    })
  })
})
