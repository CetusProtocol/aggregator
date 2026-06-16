import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("MAGMAPROPAMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_SUI)
    client = setup.client
    keypair = setup.keypair
  })

  test("MAGMAPROPAMM router - find and swap", async () => {
    await testDexRouter(
      client,
      "MAGMAPROPAMM",
      testData.M_SUI,
      testData.M_USDC,
      "1000000000",
      true
    )
  }, 30000)
})
