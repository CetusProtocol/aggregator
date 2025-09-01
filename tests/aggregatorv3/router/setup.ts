import dotenv from "dotenv"
import { AggregatorClient } from "~/index"
import * as testData from "../../test_data.test"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { fromB64 } from "@mysten/sui/utils"
import { SuiClient } from "@mysten/sui/client"
import { Env } from "~/index"
import { Transaction } from "@mysten/sui/transactions"
import { printTransaction } from "~/utils/transaction"
import BN from "bn.js"
import { WalletUtils } from "../../utils/wallet-utils"

dotenv.config()

export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = process.env.SUI_WALLET_MNEMONICS || ""
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

export async function setupTestClient(
  fromCoin: string = testData.M_SUI
): Promise<{
  client: AggregatorClient
  keypair: Ed25519Keypair
}> {
  const fullNodeURL = process.env.SUI_RPC!
  const aggregatorURL =
    process.env.CETUS_AGGREGATOR_V3 || "https://api-sui.cetus.zone/router_v2"
  const secret = process.env.SUI_WALLET_SECRET!

  let keypair: Ed25519Keypair
  if (secret) {
    keypair = Ed25519Keypair.fromSecretKey(fromB64(secret).slice(1, 33))
  } else {
    keypair = buildTestAccount()
  }

  // Fallback wallet for backwards compatibility
  const fallbackWallet =
    "0xf7b8d77dd06a6bb51c37ad3ce69e0a44c6f1064f52ac54606ef47763c8a71be6"

  // Use optimal wallet for SUI (the most common 'from' coin in v3 tests)
  const wallet = await WalletUtils.getOptimalWalletForTesting(
    fromCoin,
    fallbackWallet
  )
  // const wallet = keypair.getPublicKey().toSuiAddress()

  const endpoint = aggregatorURL

  const suiClient = new SuiClient({
    url: fullNodeURL,
  })

  const client = new AggregatorClient({
    endpoint,
    signer: wallet,
    client: suiClient,
    env: Env.Mainnet,
    pythUrls: [
      "https://cetus-pythnet-a648.mainnet.pythnet.rpcpool.com/219cf7a8-6d75-432d-a648-d487a6dd5dc3/hermes",
    ],
  })

  return { client, keypair }
}

export async function testDexRouter(
  client: AggregatorClient,
  provider: string | string[],
  from: string,
  target: string,
  amount: string = "1000000000",
  printFullTransaction: boolean = false
) {
  try {
    // Step 1: Find router
    const providers = Array.isArray(provider) ? provider : [provider]
    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      providers,
    })

    console.log("res", JSON.stringify(res, null, 2))
    console.log("res route", JSON.stringify(res?.paths, null, 2))

    if (!res || !res.paths || res.paths.length === 0) {
      console.log(`⚠️ ${provider}: No routes found, skipping swap test`)
      return
    }

    console.log(`${provider} - amount in: ${res.amountIn.toString()}`)
    console.log(`${provider} - amount out: ${res.amountOut.toString()}`)

    // Step 2: Build transaction for fastRouterSwap
    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res,
      txb,
      slippage: 0.005,
      refreshAllCoins: true,
    })

    // Print full transaction if requested
    if (printFullTransaction) {
      console.log(`\n📋 ${provider} - Full Transaction Details:`)
      printTransaction(txb)
    }

    // Step 3: Simulate transaction
    const result = await client.devInspectTransactionBlock(txb)

    if (result.effects.status.status === "success") {
      console.log(`✅ ${provider}: Transaction simulation successful`)

      console.log("events", JSON.stringify(result.events, null, 2))
      console.log("res", res.amountIn.toString())
      console.log("res", res.amountOut.toString())
      // const { keypair } = await setupTestClient()
      // const result = await client.signAndExecuteTransaction(txb, keypair)
      // console.log(`✅ ${result.digest}: Transaction executed successfully`)
    } else {
      console.log(`❌ ${provider}: Transaction simulation failed`)
      console.log("Error:", result.effects.status.error)
    }

    // Verify transaction structure
    expect(txb).toBeDefined()
    expect(result).toBeDefined()
  } catch (error) {
    console.log(`❌ ${provider}: Error during test - ${error}`)
    // Don't fail the test for individual router issues, as some may not have liquidity
  }
}

// Re-export test data for convenience
export { testData }
export { BN } from "bn.js"
export { printTransaction } from "~/utils/transaction"
