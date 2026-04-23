import { describe, test, beforeAll } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("FERRADLMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("FERRACLMM router - find and swap", async () => {
    await testDexRouter(
      client,
      ["FERRACLMM"],
      testData.M_USDC,
      testData.M_SUI,
      "1000000",
      true
    )
  }, 30000)
})
