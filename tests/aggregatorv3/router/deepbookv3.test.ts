import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("DEEPBOOKV3 Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
  })

  test("DEEPBOOKV3 router - find and swap", async () => {
    await testDexRouter(
      client,
      ["DEEPBOOKV3", "CETUS"],
      testData.M_USDC,
      testData.M_SUI,
      "1000000000000"
    )
  }, 30000)
})
