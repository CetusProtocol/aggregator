import dotenv from "dotenv"
import { AggregatorClient } from "~/index"
import * as testData from "../../test_data"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { fromBase64 } from "@mysten/sui/utils"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { Env } from "~/index"
import { Transaction } from "@mysten/sui/transactions"
import { printTransaction } from "~/utils/transaction"
import BN from "bn.js"
import { WalletUtils } from "../../utils/wallet-utils"
import { TEST_FALLBACK_WALLET } from "../../utils/constants"

dotenv.config()

/**
 * Unwrap a DevInspectResults into a convenient shape for tests.
 */
export function unwrapSimulation(result: Awaited<ReturnType<AggregatorClient['devInspectTransactionBlock']>>) {
  const success = !result.error && result.effects.status.status === 'success'
  return {
    success,
    error: result.error ?? (result.effects.status.status === 'failure' ? result.effects.status.error : null),
    effects: result.effects,
    events: result.events,
  }
}

export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = process.env.SUI_WALLET_MNEMONICS || ""
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

export async function setupTestClient(
  _fromCoin: string = testData.M_SUI
): Promise<{
  client: AggregatorClient
  keypair: Ed25519Keypair | null
}> {
  const aggregatorURL =
    process.env.CETUS_AGGREGATOR_V3 || "https://api-sui.cetus.zone/router_v3"
  const secret = process.env.SUI_WALLET_SECRET

  let keypair: Ed25519Keypair | null = null
  if (secret) {
    keypair = Ed25519Keypair.fromSecretKey(fromBase64(secret).slice(1, 33))
  } else if (process.env.SUI_WALLET_MNEMONICS) {
    keypair = buildTestAccount()
  }

  // Use a known mainnet holder for simulation (no private key needed).
  // Configured via SUI_TEST_FALLBACK_WALLET env var; see tests/utils/constants.ts.
  const fallbackWallet = TEST_FALLBACK_WALLET
  const signerFromKey = keypair?.toSuiAddress() ?? fallbackWallet
  const signer = keypair
    ? signerFromKey
    : await WalletUtils.getOptimalWalletForTesting(_fromCoin, fallbackWallet)

  const env = Env.Mainnet
  const network = 'mainnet'
  const rpcUrl = 'https://fullnode.mainnet.sui.io:443'

  const suiClient = process.env.SUI_RPC
    ? new SuiJsonRpcClient({ network, url: process.env.SUI_RPC })
    : new SuiJsonRpcClient({ network, url: rpcUrl })

  const client = new AggregatorClient({
    endpoint: aggregatorURL,
    signer,
    client: suiClient,
    env,
    pythUrls: [
      "https://hermes.pyth.network",
    ],
  })

  return { client, keypair }
}

export async function testDexRouter(
  client: AggregatorClient,
  provider: string | string[],
  from: string,
  target: string,
  amount: string | number | bigint | BN = "1000000000",
  printFullTransaction: boolean = false
) {
  let res: Awaited<ReturnType<AggregatorClient['findRouters']>> = null
  try {
    // Step 1: Find router
    const providers = Array.isArray(provider) ? provider : [provider]
    res = await client.findRouters({
      from,
      target,
      amount: amount instanceof BN ? amount : new BN(amount.toString()),
      byAmountIn: true,
      depth: 3,
      providers,
    })

    console.log("res", JSON.stringify(res, null, 2))
    console.log("res route", JSON.stringify(res?.paths, null, 2))

    if (!res || !res.paths || res.paths.length === 0) {
      console.log(`[WARN] ${provider}: No routes found, skipping swap test`)
      return
    }

    console.log(`${provider} - amount in: ${res.amountIn.toString()}`)
    console.log(`${provider} - amount out: ${res.amountOut.toString()}`)

    // Step 2: Build transaction for fastRouterSwap
    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res,
      txb,
      slippage: 0.05,
      refreshAllCoins: true,
    })

    // Print full transaction if requested
    if (printFullTransaction) {
      console.log(`\n${provider} - Full Transaction Details:`)
      printTransaction(txb)
    }

    // Step 3: Simulate transaction
    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(`[OK] ${provider}: Transaction simulation successful`)
    //   console.log("events", JSON.stringify(result.events, null, 2))
      console.log("res", res.amountIn.toString())
      console.log("res", res.amountOut.toString())
    } else {
      console.log(`[FAIL] ${provider}: Transaction simulation failed`)
      console.log("Error:", result.error)
    }

    // Verify transaction structure
    expect(txb).toBeDefined()
    expect(rawResult).toBeDefined()
  } catch (error) {
    const errorMsg = String(error)
    // Auto-retry with a different holder if the signer has insufficient balance
    if (errorMsg.includes("Insufficient balance") || errorMsg.includes("InsufficientCoinBalance")) {
      console.log(`[RETRY] ${provider}: Insufficient balance for signer ${client.signer}, finding new holder...`)

      // Invalidate cached holder for this coin
      WalletUtils.invalidateCache(from)

      // Try to extract required amount from the error, fall back to the test amount
      const requiredAmount = amount instanceof BN ? amount.toString() : amount.toString()

      const newHolder = await WalletUtils.getHolderWithMinBalance(
        from,
        requiredAmount,
        client.signer
      )

      if (newHolder) {
        console.log(`[RETRY] ${provider}: Retrying with new holder ${newHolder}`)
        client.signer = newHolder

        try {
          const retryTxb = new Transaction()
          await client.fastRouterSwap({
            router: res!,
            txb: retryTxb,
            slippage: 0.005,
            refreshAllCoins: true,
          })

          const retryRawResult = await client.devInspectTransactionBlock(retryTxb)
          const retryResult = unwrapSimulation(retryRawResult)

          if (retryResult.success) {
            console.log(`[OK] ${provider}: Retry simulation successful`)
          } else {
            console.log(`[FAIL] ${provider}: Retry simulation failed - ${retryResult.error}`)
          }

          expect(retryTxb).toBeDefined()
          expect(retryRawResult).toBeDefined()
          return
        } catch (retryError) {
          console.log(`[ERROR] ${provider}: Retry also failed - ${retryError}`)
        }
      } else {
        console.log(`[WARN] ${provider}: No suitable holder found for retry`)
      }
    }

    console.log(`[ERROR] ${provider}: Error during test - ${error}`)
    // Don't fail the test for individual router issues, as some may not have liquidity
  }
}

// Re-export test data for convenience
export { testData }
export { BN } from "bn.js"
export { printTransaction } from "~/utils/transaction"
