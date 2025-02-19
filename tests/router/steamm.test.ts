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

describe("Test steammfe module", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  const T_SUI =
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
  const T_USDC =
    "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"

  beforeAll(() => {
    const fullNodeURL = process.env.SUI_RPC!
    const aggregatorURL = process.env.CETUS_AGGREGATOR!
    const secret = process.env.SUI_WALLET_SECRET!

    if (secret) {
      keypair = Ed25519Keypair.fromSecretKey(fromB64(secret).slice(1, 33))
    } else {
      keypair = buildTestAccount()
    }

    const wallet = keypair.getPublicKey().toSuiAddress()

    console.log("wallet: ", wallet)

    const endpoint = aggregatorURL

    const suiClient = new SuiClient({
      url: fullNodeURL,
    })

    client = new AggregatorClient(endpoint, wallet, suiClient, Env.Mainnet)
  })

  test("Find Routers", async () => {
    const amounts = [
      "1000",
      "1000000",
      "100000000",
      "5000000000",
      "10000000000000",
    ]

    for (const amount of amounts) {
      const res = await client.findRouters({
        from: T_USDC,
        target: T_SUI,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["STEAMMFE"],
      })

      if (res != null) {
        console.log(JSON.stringify(res, null, 2))
      }
      console.log("amount in", res?.amountIn.toString())
      console.log("amount out", res?.amountOut.toString())
    }
  })

  test("Build Router TX", async () => {
    const amount = "10000000"

    const res = await client.findRouters({
      from: T_USDC,
      target: T_SUI,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      providers: ["STEAMM"],
    })

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())

    const txb = new Transaction()

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      await client.fastRouterSwap({
        routers: res,
        txb,
        slippage: 0.01,
        refreshAllCoins: true,
        payDeepFeeAmount: 0,
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
