import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("HAEDALHMMV2 Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("HAEDALHMMV2 router - find and swap", async () => {
    await testDexRouter(
      client,
      "HAEDALHMMV2",
      testData.M_USDC,
      testData.M_SUI,
      "300000",
      true
    )
  }, 30000)
})
