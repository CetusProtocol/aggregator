import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("STEAMM Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("STEAMM CPMM router - find and swap -> a2b", async () => {
    await testDexRouter(
      client,
      "STEAMM",
      testData.M_SUI,
      testData.M_USDC,
      "1000000000",
      true
    )
  }, 30000)

  test("STEAMM CPMM router - find and swap -> b2a", async () => {
    await testDexRouter(
      client,
      "STEAMM",
      testData.M_USDC,
      testData.M_SUI,
      "1000000",
      true
    )
  }, 30000)
})
