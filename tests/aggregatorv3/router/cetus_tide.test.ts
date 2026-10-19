import { describe, test, beforeAll } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import {
  setupTestClient,
  testData,
  unwrapSimulation,
  printTransaction,
} from "./setup"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"

describe("CETUS_TIDE Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_SUI)
    client = setup.client
    keypair = setup.keypair
  })

  test("CETUS_TIDE - find and simulate swap", async () => {
    const from = testData.M_SUI
    const target = testData.M_USDC
    const amount = "100000000"

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn: true,
      providers: ["CETUS_TIDE"],
    })

    console.log("res", JSON.stringify(res, null, 2))
    console.log("res route", JSON.stringify(res?.paths, null, 2))

    if (!res || !res.paths || res.paths.length === 0) {
      console.log("[WARN] CETUS_TIDE: No routes found, skipping swap test")
      return
    }

    console.log(`CETUS_TIDE - amount in: ${res.amountIn.toString()}`)
    console.log(`CETUS_TIDE - amount out: ${res.amountOut.toString()}`)

    const txb = new Transaction()
    await client.fastRouterSwap({
      router: res,
      txb,
      slippage: 0.05,
      refreshAllCoins: true,
    })
    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log("[OK] CETUS_TIDE: Transaction simulation successful")
    } else {
      console.log("[FAIL] CETUS_TIDE: Transaction simulation failed")
      console.log("Error:", result.error)
    }
  }, 600000)
})
