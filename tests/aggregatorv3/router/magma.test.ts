import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("MAGMA Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("MAGMA router - find and swap", async () => {
    await testDexRouter(client, "MAGMA", testData.M_SUI, testData.M_USDC)
  }, 30000)

  test("MAGMA router - find and swap -> b2a", async () => {
    const setup = await setupTestClient(testData.M_USDC)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(client, "MAGMA", testData.M_USDC, testData.M_SUI)
  }, 30000)
})
