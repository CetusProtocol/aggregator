import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("SEVENK Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("SEVENK router - find and swap", async () => {
    const setup = await setupTestClient(testData.M_DEEP)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      "SEVENK",
      testData.M_DEEP,
      testData.M_USDC,
      "20000000"
    )
  }, 30000)
})
