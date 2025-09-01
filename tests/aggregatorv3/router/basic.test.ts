import { describe, test, beforeAll, expect } from "@jest/globals"
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

  test("V3 with overlay fee", async () => {
    const clientWithFee = new AggregatorClient({
      endpoint: client.endpoint,
      signer: client.signer,
      client: client.client,
      env: Env.Mainnet,
      overlayFeeRate: 0.001, // 0.1% fee
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
