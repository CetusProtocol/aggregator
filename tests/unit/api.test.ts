import { describe, test, expect } from "vitest"
import BN from "bn.js"
import { getRouterResult, processFlattenRoutes, getMergeSwapResult } from "~/api"
import type { FindRouterParams } from "~/types/shared"
import * as testData from "../test_data"
import { TEST_OVERLAY_FEE_RECEIVER } from "../utils/constants"

const AGGREGATOR_ENDPOINT = "https://api-sui.cetus.zone/router_v3"

describe("API Layer", () => {
  describe("getRouterResult", () => {
    test("returns valid router data for SUI -> USDC", async () => {
      const params: FindRouterParams = {
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
        depth: 3,
        providers: ["CETUS"],
      }

      const result = await getRouterResult(AGGREGATOR_ENDPOINT, "", params, 0, "0x0")

      expect(result).toBeDefined()
      expect(result!.amountIn).toBeDefined()
      expect(result!.amountOut).toBeDefined()
      expect(result!.paths).toBeDefined()
      expect(result!.paths.length).toBeGreaterThan(0)
      expect(result!.quoteID).toBeDefined()
    }, 15000)

    test("returns error for invalid coin types", async () => {
      const params: FindRouterParams = {
        from: "0x0::invalid::INVALID",
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
      }

      const result = await getRouterResult(AGGREGATOR_ENDPOINT, "", params, 0, "0x0")

      expect(result).toBeDefined()
      expect(result!.error).toBeDefined()
    }, 15000)

    test("applies overlay fee correctly", async () => {
      const params: FindRouterParams = {
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
        providers: ["CETUS"],
      }

      const resultNoFee = await getRouterResult(AGGREGATOR_ENDPOINT, "", params, 0, "0x0")
      const resultWithFee = await getRouterResult(
        AGGREGATOR_ENDPOINT,
        "",
        params,
        1000, // 0.1% fee (1000/1000000)
        TEST_OVERLAY_FEE_RECEIVER
      )

      expect(resultNoFee).toBeDefined()
      expect(resultWithFee).toBeDefined()
      if (!resultNoFee!.error && !resultWithFee!.error) {
        // Amount out with fee should be less than without fee
        expect(resultWithFee!.amountOut.lt(resultNoFee!.amountOut)).toBe(true)
        expect(resultWithFee!.overlayFee).toBeGreaterThan(0)
      }
    }, 15000)
  })

  describe("processFlattenRoutes", () => {
    test("flattens single-hop route", () => {
      const routerData = {
        quoteID: "test-123",
        amountIn: new BN("1000000000"),
        amountOut: new BN("950000"),
        byAmountIn: true,
        insufficientLiquidity: false,
        deviationRatio: 0,
        paths: [
          {
            id: "pool1",
            direction: true,
            provider: "CETUS",
            from: testData.M_SUI,
            target: testData.M_USDC,
            feeRate: 2500,
            amountIn: "1000000000",
            amountOut: "950000",
            version: "1",
          },
        ],
      }

      const result = processFlattenRoutes(routerData)

      expect(result.quoteID).toBe("test-123")
      expect(result.flattenedPaths).toHaveLength(1)
      expect(result.fromCoinType).toBe(testData.M_SUI)
      expect(result.targetCoinType).toBe(testData.M_USDC)
      expect(result.flattenedPaths[0].isLastUseOfIntermediateToken).toBe(true)
    })

    test("flattens multi-hop route with intermediate token tracking", () => {
      const routerData = {
        quoteID: "test-456",
        amountIn: new BN("1000000000"),
        amountOut: new BN("500000"),
        byAmountIn: true,
        insufficientLiquidity: false,
        deviationRatio: 0,
        paths: [
          {
            id: "pool1",
            direction: true,
            provider: "CETUS",
            from: testData.M_SUI,
            target: testData.M_CETUS,
            feeRate: 2500,
            amountIn: "500000000",
            amountOut: "1000000",
            version: "1",
          },
          {
            id: "pool2",
            direction: true,
            provider: "CETUS",
            from: testData.M_SUI,
            target: testData.M_USDC,
            feeRate: 2500,
            amountIn: "500000000",
            amountOut: "250000",
            version: "1",
          },
          {
            id: "pool3",
            direction: false,
            provider: "CETUS",
            from: testData.M_CETUS,
            target: testData.M_USDC,
            feeRate: 2500,
            amountIn: "1000000",
            amountOut: "250000",
            version: "1",
          },
        ],
      }

      const result = processFlattenRoutes(routerData)

      expect(result.flattenedPaths).toHaveLength(3)
      expect(result.fromCoinType).toBe(testData.M_SUI)
      expect(result.targetCoinType).toBe(testData.M_USDC)

      // The last occurrence of each "from" token (in reverse) should be marked
      // Path 2 (index 2) uses M_CETUS as from - last use in reverse
      // Path 1 (index 1) uses M_SUI as from - last use in reverse
      // Path 0 (index 0) uses M_SUI - already seen, so NOT marked
      expect(result.flattenedPaths[2].isLastUseOfIntermediateToken).toBe(true) // M_CETUS first seen in reverse
      expect(result.flattenedPaths[1].isLastUseOfIntermediateToken).toBe(true) // M_SUI first seen in reverse
      expect(result.flattenedPaths[0].isLastUseOfIntermediateToken).toBe(false) // M_SUI already seen
    })

    test("preserves packages and overlay fee", () => {
      const packages = new Map<string, string>()
      packages.set("aggregator_v3", "0xabc123")

      const routerData = {
        quoteID: "test-789",
        amountIn: new BN("1000"),
        amountOut: new BN("900"),
        byAmountIn: true,
        insufficientLiquidity: false,
        deviationRatio: 0,
        packages,
        overlayFee: 100,
        paths: [
          {
            id: "pool1",
            direction: true,
            provider: "CETUS",
            from: "A",
            target: "B",
            feeRate: 100,
            amountIn: "1000",
            amountOut: "900",
            version: "1",
          },
        ],
      }

      const result = processFlattenRoutes(routerData)
      expect(result.packages?.get("aggregator_v3")).toBe("0xabc123")
      expect(result.overlayFee).toBe(100)
    })
  })

  describe("getMergeSwapResult", () => {
    test("returns valid merge swap data", async () => {
      const result = await getMergeSwapResult(
        AGGREGATOR_ENDPOINT,
        "",
        {
          target: testData.M_USDC,
          byAmountIn: true,
          depth: 3,
          providers: ["CETUS"],
          froms: [
            { coinType: testData.M_SUI, amount: new BN("1000000000") },
            { coinType: testData.M_DEEP, amount: new BN("100000000") },
          ],
        },
        0,
        "0x0"
      )

      expect(result).toBeDefined()
      if (result && !result.error) {
        expect(result.allRoutes.length).toBeGreaterThan(0)
        expect(result.totalAmountOut.gt(new BN(0))).toBe(true)
      }
    }, 15000)
  })
})
