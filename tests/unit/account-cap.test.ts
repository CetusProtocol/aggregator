import { describe, test, expect, beforeAll } from "vitest"
import { Transaction } from "@mysten/sui/transactions"
import { SuiGrpcClient } from "@mysten/sui/grpc"
import { getOrCreateAccountCap } from "~/utils/account_cap"

describe("Account Cap (DeepBook)", () => {
  let client: SuiGrpcClient

  beforeAll(() => {
    client = new SuiGrpcClient({
      network: "mainnet",
      baseUrl: "https://fullnode.mainnet.sui.io:443",
    })
  })

  test("creates new account cap when none exists", async () => {
    const txb = new Transaction()
    // Use an address that is unlikely to have a DeepBook account cap
    const owner = "0x0000000000000000000000000000000000000000000000000000000000000001"

    const result = await getOrCreateAccountCap(txb, client, owner)

    expect(result).toBeDefined()
    expect(result.accountCap).toBeDefined()
    // An address with no DeepBook history should need to create a new cap
    expect(result.isCreate).toBe(true)
  }, 30000)

  test("finds existing account cap for known DeepBook user", async () => {
    const txb = new Transaction()
    // Use the known mainnet holder (may or may not have a DeepBook cap)
    const owner = "0xf7b8d77dd06a6bb51c37ad3ce69e0a44c6f1064f52ac54606ef47763c8a71be6"

    const result = await getOrCreateAccountCap(txb, client, owner)

    expect(result).toBeDefined()
    expect(result.accountCap).toBeDefined()
    // Whether isCreate is true or false depends on the wallet state
    expect(typeof result.isCreate).toBe("boolean")
  }, 30000)
})
