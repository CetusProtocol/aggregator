import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("HAEDAL Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("HAEDAL router - find and swap", async () => {
    await testDexRouter(
      client,
      "HAEDAL",
      testData.M_SUI,
      testData.M_HASUI,
      "10000000000"
    )
  }, 30000)
})
