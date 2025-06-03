import { describe, test } from "@jest/globals"
import dotenv from "dotenv"
import { AggregatorClient } from "~/client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { printTransaction } from "~/utils/transaction"
import BN from "bn.js"
import { fromB64 } from "@mysten/sui/utils"
import { SuiClient } from "@mysten/sui/client"
import { Env } from "~/index"
import { Transaction } from "@mysten/sui/transactions"

dotenv.config()

export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = process.env.SUI_WALLET_MNEMONICS || ""
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

describe("Test hawal provider", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  const T_HAWAL = "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL"
  const T_WAL  = "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL"

  beforeAll(() => {
    const fullNodeURL = process.env.SUI_RPC!
    const aggregatorURL = process.env.CETUS_AGGREGATOR!
    const secret = process.env.SUI_WALLET_SECRET!

    if (secret) {
      keypair = Ed25519Keypair.fromSecretKey(fromB64(secret).slice(1, 33))
    } else {
      keypair = buildTestAccount()
    }
    console.log("keypair wallet: ", keypair.getPublicKey().toSuiAddress().toString())

    const wallet =keypair.getPublicKey().toSuiAddress()
    console.log("wallet: ", wallet)

    const endpoint = aggregatorURL

    const suiClient = new SuiClient({
      url: fullNodeURL,
    })

    client = new AggregatorClient({
      endpoint,
      signer: wallet,
      client: suiClient,
      env: Env.Mainnet,
      pythUrls: ["https://cetus-pythnet-a648.mainnet.pythnet.rpcpool.com/219cf7a8-6d75-432d-a648-d487a6dd5dc3/hermes"],
      apiKey: "8MJDUzLDPJxCgbc7I0bHXSg994mVfh8NRMqV6hcQ",
      overlayFeeRate: 0.01,
      overlayFeeReceiver: "0xa6c8f6e7058442e5a05778d46b721c12b5b930e0859717e05eed1b275bbafc2e",
    })
  })

  test("Find Routers", async () => {
    const amounts = ["100000000", "1000000000", "5000000000", "10000000000000"]
    
    let i = 0
    while (i < amounts.length) {
      const res = await client.findRouters({
        from: T_WAL,
        target: T_HAWAL,
        amount: new BN(amounts[i]),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["HAWAL"],
      })

      if (res != null) {
        console.log(JSON.stringify(res, null, 2))
      }
      console.log("amount in", res?.amountIn.toString())
      console.log("amount out", res?.amountOut.toString())
      i++
    }
  }, 6000000)

  test("Build Router TX", async () => {
    const amount = "1000000000"

    const res = await client.findRouters({
      from: T_WAL,
      target: T_HAWAL,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      splitCount: 2,
      providers: ["HAWAL"],
    })

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())

    const txb = new Transaction()

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      await client.fastRouterSwap({
        routers: res,
        txb,
        slippage: 0.02,
        refreshAllCoins: true,
        payDeepFeeAmount: 0
      })

      txb.setSender(client.signer)
      const buildTxb = await txb.build({ client: client.client })
      // const buildTxb = await txb.getData()
      
      console.log("buildTxb", buildTxb)

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
      for (const event of result.events) {
        console.log("event", JSON.stringify(event, null, 2))
      }

      if (result.effects.status.status === "success") {
        const result = await client.signAndExecuteTransaction(txb, keypair)
        console.log("result", result)
      } else {
        console.log("result", result)
      }
    }
  }, 600000)
})
