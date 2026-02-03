import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("FULLSAIL Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("FULLSAIL router - find and swap a2b", async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      "FULLSAIL",
      testData.M_USDC,
      testData.M_SUI,
      "1000000",
      false
    )
  }, 30000)

  test("FULLSAIL router - find and swap -> b2a", async () => {
    const setup = await setupTestClient(testData.M_SUI)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      "FULLSAIL",
      testData.M_SUI,
      testData.M_USDC,
      "100000",
      true
    )
  }, 30000)
})
