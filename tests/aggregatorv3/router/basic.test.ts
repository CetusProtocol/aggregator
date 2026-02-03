import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { Env } from "~/index"
import { setupTestClient, testData, BN } from "./setup"

describe("AggregatorV3 Basic Functionality", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient(
      "0x0b559e66f39afcc202b7f529571eccad713402bc9fd4e3ecfa0956bbe24a3f51::cctoo::CCTOO"
    )
    client = setup.client
    keypair = setup.keypair
  })

  test("AggregatorV3 basic find router", async () => {
    const amount = "1000000000"
    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 1,
      splitAlgorithm: "amount",
      splitFactor: 1,
      splitCount: 1,
      providers: ["CETUS"],
    })

    console.log("res", res)

    expect(res).toBeDefined()
    if (res) {
      expect(res.amountIn).toBeDefined()
      expect(res.amountOut).toBeDefined()
      console.log("V3 Basic router - amount in:", res.amountIn.toString())
      console.log("V3 Basic router - amount out:", res.amountOut.toString())
    }
  }, 30000)

  test("V3 Route flattening and execution order", async () => {
    const amount = "22027627938401" // 2 SUI
    const res = await client.findRouters({
      from: "0x0b559e66f39afcc202b7f529571eccad713402bc9fd4e3ecfa0956bbe24a3f51::cctoo::CCTOO",
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      // depth: 3, // Allow multi-hop to test route flattening
      // splitCount: 2, // Allow splitting to test complex routes
      // providers: ["CETUS", "KRIYAV3", "TURBOS"], // Use multiple providers
    })

    if (res && res.paths) {
      console.log("V3 Complex route found:")
      console.log(`Paths count: ${res.paths.length}`)
      console.log(`Amount in: ${res.amountIn.toString()}`)
      console.log(`Amount out: ${res.amountOut.toString()}`)

      // Test that we can build a transaction with complex routes
      const txb = new Transaction()
      await client.fastRouterSwap({
        router: res,
        txb,
        slippage: 0.5,
        refreshAllCoins: true,
      })

      const result = await client.devInspectTransactionBlock(txb)

      console.log("result", JSON.stringify(result, null, 2))
      console.log("result.events", JSON.stringify(result.events, null, 2))
    }
  }, 45000)

  test("V3 with overlay fee", async () => {
    const clientWithFee = new AggregatorClient({
      endpoint: client.endpoint,
      signer: client.signer,
      client: client.client,
      env: Env.Mainnet,
      overlayFeeRate: 0.1, // 0.1% fee
      overlayFeeReceiver:
        "0x2a3f0d37e42b91dfa0ca3b4887de5cca9dce1a01551e4837947e7f40340973a5",
    })

    const amount = "1000000000"
    const res = await clientWithFee.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      providers: ["CETUS"],
    })

    if (res) {
      const txb = new Transaction()
      await clientWithFee.fastRouterSwap({
        router: res,
        txb,
        slippage: 0.05,
        refreshAllCoins: true,
      })

      const result = await clientWithFee.devInspectTransactionBlock(txb)
      expect(result.effects.status.status).toBe("success")
      console.log("✅ V3 overlay fee test passed")
    }
  }, 30000)

  test("V3 error handling - unsupported DEX", async () => {
    try {
      await client.findRouters({
        from: testData.M_SUI,
        target: testData.M_USDC,
        amount: new BN("1000000000"),
        byAmountIn: true,
        providers: ["NONEXISTENT_DEX"],
      })
    } catch (error) {
      expect(error).toBeDefined()
      console.log("✅ V3 error handling test passed")
    }
  }, 10000)
})
