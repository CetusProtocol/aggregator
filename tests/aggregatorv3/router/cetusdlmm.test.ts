import { describe, test, beforeAll } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("CETUSDLMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("CETUSDLMM router - find and swap", async () => {
    await testDexRouter(
      client,
      ["CETUSDLMM"],
      testData.M_SUI,
      testData.M_USDC,
      "100000000",
      true
    )
  }, 30000)
})
