import { describe, test, expect, beforeAll } from "vitest"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"
import { AggregatorClient, Env } from "~/index"
import { setupTestClient, unwrapSimulation, testData } from "../aggregatorv3/router/setup"
import { TEST_OVERLAY_FEE_RECEIVER } from "../utils/constants"

describe("AggregatorClient", () => {
  let client: AggregatorClient

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
  })

  describe("constructor", () => {
    test("creates client with mainnet env", () => {
      expect(client).toBeDefined()
      expect(client.env).toBe(Env.Mainnet)
      expect(client.endpoint).toBeDefined()
      expect(client.signer).toBeDefined()
    })

    test("creates client with overlay fee config", () => {
      const feeClient = new AggregatorClient({
        endpoint: client.endpoint,
        signer: client.signer,
        client: client.client,
        env: Env.Mainnet,
        overlayFeeRate: 0.1,
        overlayFeeReceiver: TEST_OVERLAY_FEE_RECEIVER,
      })
      expect(feeClient).toBeDefined()
    })
  })

  describe("findRouters", () => {
    test("finds SUI -> USDC route", async () => {
      const res = await client.findRouters({
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
        depth: 1,
        providers: ["CETUS"],
      })

      expect(res).toBeDefined()
      expect(res!.amountIn).toBeDefined()
      expect(res!.amountOut).toBeDefined()
      expect(res!.paths).toBeDefined()
      expect(res!.paths.length).toBeGreaterThan(0)
    }, 30000)

    test("returns result with valid amountIn/amountOut", async () => {
      const res = await client.findRouters({
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("2000000000"),
        byAmountIn: true,
        providers: ["CETUS"],
      })

      expect(res).toBeDefined()
      expect(res!.amountIn.gt(new BN(0))).toBe(true)
      expect(res!.amountOut.gt(new BN(0))).toBe(true)
    }, 30000)
  })

  describe("fastRouterSwap + simulation", () => {
    test("builds and simulates SUI -> USDC swap", async () => {
      const res = await client.findRouters({
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
        providers: ["CETUS"],
      })

      expect(res).toBeDefined()

      const txb = new Transaction()
      await client.fastRouterSwap({
        router: res!,
        txb,
        slippage: 0.05,
        refreshAllCoins: true,
      })

      const rawResult = await client.devInspectTransactionBlock(txb)
      const result = unwrapSimulation(rawResult)

      expect(result.success).toBe(true)
    }, 60000)
  })

  describe("devInspectTransactionBlock", () => {
    test("returns discriminated union result", async () => {
      const res = await client.findRouters({
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("100000000"),
        byAmountIn: true,
        providers: ["CETUS"],
      })

      const txb = new Transaction()
      await client.fastRouterSwap({
        router: res!,
        txb,
        slippage: 0.05,
        refreshAllCoins: true,
      })

      const result = await client.devInspectTransactionBlock(txb)

      // DevInspectResults has effects and events
      expect(result.effects).toBeDefined()
      expect(result.effects.status).toBeDefined()
      expect(['success', 'failure']).toContain(result.effects.status.status)
      expect(result.events).toBeDefined()
    }, 60000)
  })

  describe("findMergeSwapRouters", () => {
    test("finds merge swap routes for multiple source coins", async () => {
      const result = await client.findMergeSwapRouters({
        target: testData.M_USDC,
        byAmountIn: true,
        depth: 3,
        providers: ["CETUS"],
        froms: [
          {
            coinType: testData.M_DEEP,
            amount: new BN("100000000"),
          },
          {
            coinType: testData.M_SUI,
            amount: new BN("1000000000"),
          },
        ],
      })

      expect(result).toBeDefined()
      if (result && !result.error) {
        expect(result.allRoutes).toBeDefined()
        expect(result.allRoutes.length).toBeGreaterThan(0)
        expect(result.totalAmountOut).toBeDefined()
      }
    }, 30000)
  })
})
