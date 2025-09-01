import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("METASTABLE Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("METASTABLE router - find and swap", async () => {
    await testDexRouter(
      client,
      "METASTABLE",
      testData.M_USDC,
      testData.M_MUSD,
      "1000000"
    )
  }, 30000)
})
