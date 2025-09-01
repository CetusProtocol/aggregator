import { describe, test, beforeAll, expect } from "@jest/globals"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("HAEDALPMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("HAEDALPMM router - find and swap", async () => {
    await testDexRouter(
      client,
      "HAEDALPMM",
      testData.M_SUI,
      testData.M_USDC,
      "1000000000",
      true
    )
  }, 30000)
})
