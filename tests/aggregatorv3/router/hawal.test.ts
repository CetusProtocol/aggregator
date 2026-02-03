import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient, testDexRouter, testData } from "./setup"

describe("HAWAL Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("HAWAL router - find and swap", async () => {
    await testDexRouter(
      client,
      "HAWAL",
      testData.M_WAL,
      testData.M_HAWAL,
      "1000000000",
      true
    )
  }, 30000)
})
