import { describe, test, beforeAll } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import {
  setupTestClient,
  testDexRouter,
  testData,
  printTransaction,
} from "./setup"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"

describe("CETUS Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("CETUS router - find and swap", async () => {
    await testDexRouter(
      client,
      "CETUS",
      testData.M_SUI,
      testData.M_USDC,
      "10000000000",
      true
    )
  }, 30000)

  test("By amount out", async () => {
    const from = testData.M_USDC
    const target = testData.M_CETUS

    const setup = await setupTestClient(from)
    client = setup.client
    keypair = setup.keypair

    const amount = "50000000"
    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn: false,
      splitCount: 20,
      providers: ["CETUS"],
    })

    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res!,
      txb,
      slippage: 0.01, // 5% slippage tolerance
      refreshAllCoins: true,
    })

    printTransaction(txb)

    const result = await client.devInspectTransactionBlock(txb)

    if (result.effects.status.status === "success") {
      console.log(`✅ Transaction simulation successful`)
    } else {
      console.log(`❌ Transaction simulation failed`)
      console.log("Error:", result.effects.status.error)
    }
  }, 600000)

  test("Downgrade", async () => {
    const amount = "1000000000"

    const res = await client.swapInPools({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      pools: [
        "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        "0x7f9719a9fdd200b6f65bcef7fb3e2992ecd7aca5331a1b4a7a6a38dd4d1aa282",
      ],
    })

    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res!.routeData!,
      txb,
      slippage: 0.05, // 5% slippage tolerance
      refreshAllCoins: true,
    })

    printTransaction(txb)

    const result = await client.devInspectTransactionBlock(txb)

    if (result.effects.status.status === "success") {
      console.log(`✅ Transaction simulation successful`)
    } else {
      console.log(`❌ Transaction simulation failed`)
      console.log("Error:", result.effects.status.error)
    }
  }, 50000)
})
