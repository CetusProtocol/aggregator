import { describe, test, beforeAll, expect } from "vitest"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"
import { AggregatorClient } from "~/index"

describe("AFSUI Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("AFSUI router - find and swap", async () => {
    await testDexRouter(
      client,
      "AFSUI",
      testData.M_SUI,
      testData.M_AFSUI,
      "10000000000",
      true
    )
  }, 30000)
})
