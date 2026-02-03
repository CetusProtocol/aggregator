import { Transaction } from "@mysten/sui/transactions"
import { AggregatorClient, MergeSwapParams, Env } from "../src"
import BN from "bn.js"
import { printTransaction } from "../src/utils"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { setupTestClient } from "./aggregatorv3/router/setup"

describe("Merge Swap Test", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeEach(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  it("should find merge swap routes", async () => {
    const params: MergeSwapParams = {
      target:
        "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      byAmountIn: true,
      depth: 3,
      providers: ["CETUS"],
      froms: [
        {
          coinType:
            "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
          amount: new BN("100000000"),
        },
        {
          coinType:
            "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
          amount: new BN("1000000000"),
        },
        {
          coinType: "0x002::sui::SUI",
          amount: new BN("3000000000"),
        },
      ],
    }

    const result = await client.findMergeSwapRouters(params)

    expect(result).toBeDefined()
    if (result && !result.error) {
      expect(result.allRoutes).toBeDefined()
      expect(result.allRoutes.length).toBeGreaterThan(0)
      expect(result.totalAmountOut).toBeDefined()

      console.log("Merge swap result:", {
        quoteID: result.quoteID,
        routeCount: result.allRoutes.length,
        totalAmountOut: result.totalAmountOut.toString(),
      })

      result.allRoutes.forEach((route, index) => {
        console.log(`Route ${index + 1}:`, {
          amountIn: route.amountIn.toString(),
          amountOut: route.amountOut.toString(),
          pathCount: route.paths.length,
          deviationRatio: route.deviationRatio,
        })
      })
    }
  }, 30000)

  it("should handle merge swap with different coin types", async () => {
    const params: MergeSwapParams = {
      target: "0x2::sui::SUI",
      byAmountIn: false,
      depth: 2,
      froms: [
        {
          coinType:
            "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
          amount: "2000000000",
        },
        {
          coinType:
            "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
          amount: "3000000000000000000",
        },
      ],
      providers: ["DEEPBOOKV3"],
    }

    const result = await client.findMergeSwapRouters(params)
    console.log("result", JSON.stringify(result, null, 2))

    expect(result).toBeDefined()
    if (result && !result.error) {
      expect(result.allRoutes).toBeDefined()

      console.log("Merge swap (by amount out) result:", {
        quoteID: result.quoteID,
        routeCount: result.allRoutes.length,
        totalAmountOut: result.totalAmountOut.toString(),
      })
    }
  }, 30000)

  it("should execute fastMergeSwap with valid routes", async () => {
    // First get a working route from the first test case
    const params: MergeSwapParams = {
      target:
        "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      byAmountIn: true,
      depth: 3,
      providers: ["CETUS", "BLUEFIN"],
      froms: [
        {
          coinType:
            "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
          amount: new BN("100000000"),
        },
        {
          coinType:
            "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
          amount: new BN("10000000000"),
        },
        {
          coinType: "0x2::sui::SUI",
          amount: new BN("3000000000"),
        },
        {
          coinType:
            "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
          amount: new BN("100000000"),
        },
        {
          coinType:
            "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
          amount: new BN("100000"),
        },
        {
          coinType:
            "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
          amount: new BN("10000000000"),
        },
        {
          coinType:
            "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
          amount: new BN("1000000000"),
        },
      ],
    }

    const res = await client.findMergeSwapRouters(params)

    // Check if routes were found
    if (!res || res.error || !res.allRoutes || res.allRoutes.length === 0) {
      console.log("No routes found or error occurred:", res?.error)
      console.log("Response:", res)
      return
    }

    console.log("Found merge swap routes:")
    console.log("- Quote ID:", res.quoteID)
    console.log("- Routes count:", res.allRoutes.length)
    console.log("- Total amount out:", res.totalAmountOut.toString())

    const txb = new Transaction()

    await client.fastMergeSwap({
      router: res,
      txb,
      slippage: 0.01, // 1% slippage tolerance
    })

    // printTransaction(txb)

    const result = await client.devInspectTransactionBlock(txb)

    if (result.effects.status.status === "success") {
      console.log(`✅ Transaction simulation successful`)
    } else {
      console.log(`❌ Transaction simulation failed`)
      console.log("Error:", result.effects.status.error)
    }
  }, 30000)
})
