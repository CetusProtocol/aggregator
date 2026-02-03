import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("SCALLOP Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient(testData.M_SSUI)
    client = setup.client
    keypair = setup.keypair
  })

  test("SCALLOP router - find and swap -> a2b", async () => {
    await testDexRouter(
      client,
      "SCALLOP",
      testData.M_SUI,
      testData.M_SSUI,
      "1000000000"
    )
  }, 30000)

  test("SCALLOP router - find and swap -> b2a", async () => {
    await testDexRouter(
      client,
      "SCALLOP",
      testData.M_SSUI,
      testData.M_SUI,
      "1000000000"
    )
  }, 30000)
})
