import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("STEAMM_OMM_V2 Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
  })

  test("STEAMM_OMM_V2 router - find and swap", async () => {
    await testDexRouter(
      client,
      "STEAMM_OMM_V2",
      testData.M_USDC,
      testData.M_SUI,
      "100000000"
    )
  }, 30000)
})
