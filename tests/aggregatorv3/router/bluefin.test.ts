import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("BLUEFIN Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("BLUEFIN router - find and swap", async () => {
    await testDexRouter(
      client,
      "BLUEFIN",
      testData.M_SUI,
      testData.M_USDC,
      "10000000000",
      true
    )
  }, 30000)

  test("BLUEFIN router - find and swap", async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      "BLUEFIN",
      testData.M_USDC,
      testData.M_SUI,
      "400000",
      true
    )
  }, 30000)
})
