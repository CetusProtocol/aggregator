import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("SPRINGSUI Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("SPRINGSUI router - find and swap", async () => {
    const setup = await setupTestClient(testData.M_SPRINGSUI)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      "SPRINGSUI",
      testData.M_SUI,
      testData.M_OINKSUI,
      "100000000000000"
    )
  }, 30000)
})
