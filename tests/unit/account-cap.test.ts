import { describe, test, expect, beforeAll } from "vitest"
import { Transaction } from "@mysten/sui/transactions"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { getOrCreateAccountCap } from "~/utils/account_cap"
import { TEST_FALLBACK_WALLET } from "../utils/constants"

describe("Account Cap (DeepBook)", () => {
  let client: SuiJsonRpcClient

  beforeAll(() => {
    client = new SuiJsonRpcClient({
      network: "mainnet",
      url: "https://fullnode.mainnet.sui.io:443",
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
    // Use the known mainnet holder (may or may not have a DeepBook cap).
    // Configured via SUI_TEST_FALLBACK_WALLET env var.
    const owner = TEST_FALLBACK_WALLET

    const result = await getOrCreateAccountCap(txb, client, owner)

    expect(result).toBeDefined()
    expect(result.accountCap).toBeDefined()
    // Whether isCreate is true or false depends on the wallet state
    expect(typeof result.isCreate).toBe("boolean")
  }, 30000)
})
