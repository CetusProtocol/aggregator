import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { Transaction } from "@mysten/sui/transactions"
import { setupTestClient, testData, BN, printTransaction } from "./setup"

describe("AggregatorV3 Comprehensive Tests", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("All V3 DEX routers - comprehensive test", async () => {
    const allDexes = [
      // Phase 1: CLMM
      "CETUS",
      "KRIYAV3",
      "FLOWXV3",
      "TURBOS",
      "BLUEFIN",
      "MOMENTUM",
      "MAGMA",
      // Phase 2: AMM & Order Book
      "KRIYA",
      "FLOWX",
      "BLUEMOVE",
      "DEEPBOOKV3",
      // Phase 3: Complex Protocols
      "AFTERMATH",
      "STEAMM",
      "SCALLOP",
      "SUILEND",
      "SPRINGSUI",
      // Phase 4: Oracle-driven
      "HAEDALPMM",
      "OBRIC",
      "SEVENK",
      "STEAMM_OMM",
      "STEAMM_OMM_V2",
      "METASTABLE",
      // Phase 5: Staking
      "ALPHAFI",
      "VOLO",
      "AFSUI",
      "HAEDAL",
      "HAWAL",
    ]

    const amount = "500000000" // 0.5 SUI
    let successCount = 0
    let failureCount = 0

    // Check if detailed transaction printing is enabled via environment variable
    const printTransactions = process.env.PRINT_FULL_TRANSACTIONS === "true"
    if (printTransactions) {
      console.log(
        "🔍 Full transaction printing enabled via PRINT_FULL_TRANSACTIONS=true"
      )
    }

    for (const dex of allDexes) {
      try {
        console.log(`Testing ${dex}...`)
        const res = await client.findRouters({
          from: testData.M_SUI,
          target: testData.M_USDC,
          amount: new BN(amount),
          byAmountIn: true,
          depth: 1,
          splitCount: 1,
          providers: [dex],
        })

        if (res && res.paths && res.paths.length > 0) {
          console.log(
            `✅ ${dex}: Found route - ${res.amountOut.toString()} USDC`
          )

          // Optionally build and print transaction for successful routes
          if (printTransactions) {
            try {
              const txb = new Transaction()
              await client.fastRouterSwap({
                router: res,
                txb,
                slippage: 0.05,
                refreshAllCoins: true,
              })
              console.log(`\n📋 ${dex} - Full Transaction Details:`)
              printTransaction(txb)
            } catch (txError) {
              console.log(`⚠️ ${dex}: Transaction build failed - ${txError}`)
            }
          }

          successCount++
        } else {
          console.log(`⚠️ ${dex}: No routes found`)
          failureCount++
        }
      } catch (error) {
        console.log(`❌ ${dex}: Error - ${error}`)
        failureCount++
      }
    }

    console.log(`\n📊 Test Summary:`)
    console.log(`✅ Successful DEX routers: ${successCount}`)
    console.log(`❌ Failed DEX routers: ${failureCount}`)
    console.log(
      `📈 Success rate: ${((successCount / allDexes.length) * 100).toFixed(1)}%`
    )

    // At least 30% of DEX routers should work (some may not have liquidity for test pairs)
    expect(successCount).toBeGreaterThan(allDexes.length * 0.3)
  }, 180000) // 3 minutes timeout for comprehensive test
})
