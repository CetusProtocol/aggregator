import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("FLOWX Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("FLOWX router - find and swap", async () => {
    await testDexRouter(client, "FLOWX", testData.M_SUI, testData.M_wUSDC)
  }, 30000)
})
