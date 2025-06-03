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

describe("Test scallop provider", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  const T_HASUI = "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"
  const T_SHASUI = "0x9a2376943f7d22f88087c259c5889925f332ca4347e669dc37d54c2bf651af3c::scallop_ha_sui::SCALLOP_HA_SUI"
  
  const T_SUI = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  const T_SSUI  = "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI"

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

    client = new AggregatorClient({
      endpoint,
      signer: wallet,
      client: suiClient,
      env: Env.Mainnet,
      pythUrls: ["https://cetus-pythnet-a648.mainnet.pythnet.rpcpool.com/219cf7a8-6d75-432d-a648-d487a6dd5dc3/hermes"],
    })
  })

  test("Find Routers", async () => {
    const amounts = ["1000", "1000000", "100000000", "5000000000", "1000000000000000000000000000"]
    
    while (true) {
      const res = await client.findRouters({
        from: T_SUI,
        target: T_SSUI,
        amount: new BN("1000000000000000000000000000"),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["SCALLOP"],
      })

      if (res != null) {
        console.log(JSON.stringify(res, null, 2))
      }
      console.log("amount in", res?.amountIn.toString())
      console.log("amount out", res?.amountOut.toString())
    }
  }, 6000000)

  test("Build Router TX", async () => {
    const amount = "10000000"

    const res = await client.findRouters({
      from: T_HASUI,
      target: T_SHASUI,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      providers: ["SCALLOP"],
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
