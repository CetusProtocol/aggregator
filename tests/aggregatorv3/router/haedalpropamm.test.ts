import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("HAEDALPROPAMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
  })

  test("HAEDALPROPAMM router - find and swap", async () => {
    await testDexRouter(
      client,
      "HAEDALPROPAMM",
      testData.M_USDC,
      testData.M_SUI,
      "10000",
      true
    )
  }, 30000)
})
