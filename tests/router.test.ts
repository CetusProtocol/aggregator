import { describe, test } from "@jest/globals"
import dotenv from "dotenv"
import { AggregatorClient } from "~/client"
import { M_CETUS, M_NAVI, M_SSWP, M_SUI, M_USDC } from "./test_data.test"
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

describe("router module", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(() => {
    const fullNodeURL = process.env.SUI_RPC!
    const aggregatorURL = process.env.CETUS_AGGREGATOR!
    const secret = process.env.SUI_WALLET_SECRET!

    if (secret) {
      keypair = Ed25519Keypair.fromSecretKey(fromB64(secret).slice(1, 33))
    } else {
      keypair = buildTestAccount()
    }

    // const wallet = keypair.getPublicKey().toSuiAddress()

    // console.log("wallet", wallet, "\n", wallet.toString())

    const wallet =
      "0xfba94aa36e93ccc7d84a6a57040fc51983223f1b522a8d0be3c3bf2c98977ebb"
    // const wallet =
    //   "0xa459702162b73204eed77420d93d9453b7a7b893a0edea1e268607cf7fa76e03"
    // const wallet =
    // "0xaabf2fedcb36146db164bec930b74a47969c4df98216e049342a3c49b6d11580"
    // const wallet = "0x410456cfc689666936b6bf80fbec958b69499b9f7183ecba07de577c17248a44"
    // const wallet = "0xca171941521153181ff729d53489eaae7e99c3f4692884afd7cca61154e4cec4"
    console.log("wallet: ", wallet)

    const aggregatorPackage = {
      packageName: "aggregator",
      packageId:
        "0x640d44dbdc0ede165c7cc417d7f57f1b09648083109de7132c6b3fb15861f5ee",
      publishedAt:
        "0x640d44dbdc0ede165c7cc417d7f57f1b09648083109de7132c6b3fb15861f5ee",
    }

    const integratePackage = {
      packageName: "integrate",
      packageId:
        "0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3",
      publishedAt:
        "0x8faab90228e4c4df91c41626bbaefa19fc25c514405ac64de54578dec9e6f5ee",
    }
    const endpoint =
      "https://api-sui-cloudfront.cetus.zone/router_v2/find_routes"
    const suiClient = new SuiClient({
      url: "https://fullnode.mainnet.sui.io:443",
    })
    client = new AggregatorClient(endpoint, wallet, suiClient, Env.Mainnet)
  })

  test("Get all coins", () => {
    return client.getAllCoins().then((coins) => {
      console.log(coins)
    })
  })

  test("Downgrade swap in route", async () => {
    const amount = 100000
    const byAmountIn = false

    const res: any = await client.swapInPools({
      from: M_USDC,
      target: M_SUI,
      amount: new BN(amount),
      byAmountIn,
      pools: [
        "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630",
      ],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      const txb = new Transaction()
      await client.fastRouterSwap({
        routers: res.routeData.routes,
        byAmountIn,
        txb,
        slippage: 0.01,
        isMergeTragetCoin: false,
        refreshAllCoins: true,
      })

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:114 ~ test ~ result:", result)
    }
  }, 10000)

  test("Find router", async () => {
    const amount = "4239267610000000000"
    const res = await client.findRouters({
      from: M_SUI,
      target: M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      splitCount: 1,
      // providers: ["CETUS"],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }
    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())
  })

  test("Build router tx", async () => {
    const byAmountIn = true
    const amount = "1000000000"

    // const from = M_USDC
    // const target = M_SUI

    const from = M_SUI
    // const target =
    //   "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"
    // const target =
    //   "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"

    const target = M_USDC

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 3,
      providers: [
        // "CETUS",
        // "DEEPBOOK",
        // "AFTERMATH",
        // "FLOWX",
        // "KRIYA",
        // "KRIYAV3",
        // "TURBOS",
        "FLOWXV3",
      ],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())

    const txb = new Transaction()

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      await client.fastRouterSwap({
        routers: res.routes,
        byAmountIn,
        txb,
        slippage: 0.01,
        isMergeTragetCoin: false,
        refreshAllCoins: true,
      })

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)

      // if (result.effects.status.status === "success") {
      //   console.log("Sim exec transaction success")
      //   const result = await client.signAndExecuteTransaction(txb, keypair)
      //   // console.log("result", result)
      // } else {
      //   console.log("result", result)
      // }
    }
  }, 600000)

  test("By amount out", async () => {
    const byAmountIn = false
    const amount = "10000000000"

    const from = M_USDC
    const target = M_SSWP

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 3,
      providers: ["CETUS"],
    })

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())

    const txb = new Transaction()
    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      await client.fastRouterSwap({
        routers: res.routes,
        byAmountIn,
        txb,
        slippage: 0.02,
        isMergeTragetCoin: false,
        refreshAllCoins: true,
      })

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)

      if (result.effects.status.status === "success") {
        console.log("Sim exec transaction success")
        // const result = await client.signAndExecuteTransaction(txb, keypair)
        // console.log("result", result)
      } else {
        console.log("result", result)
      }
    }
  }, 600000)

  test("Test Multi Input", async () => {
    const amounts = [1000000000, 2000000000, 10000000000000]
    const froms = [M_USDC, M_SUI, M_CETUS, M_NAVI]
    const tos = [M_SUI, M_USDC, M_USDC, M_SUI]

    for (let i = 0; i < froms.length; i++) {
      const from = froms[i]
      const target = tos[i]
      for (const amount of amounts) {
        for (const byAmountIn of [true, false]) {
          console.log({
            from,
            target,
            amount,
            byAmountIn,
          })

          const res = await client.findRouters({
            from,
            target,
            amount: new BN(amount),
            byAmountIn,
          })

          const txb = new Transaction()

          if (res != null) {
            await client.fastRouterSwap({
              routers: res.routes,
              byAmountIn,
              slippage: 0.01,
              txb,
              isMergeTragetCoin: false,
            })

            let result = await client.devInspectTransactionBlock(txb)
            // console.log('result', result)

            if (result.effects.status.status === "success") {
              console.log("Sim exec transaction success")
              // const result = await client.signAndExecuteTransaction(routerTx, keypair)
              // console.log('result', result)
            } else {
              console.log("Sim exec transaction failed")
              // console.log('result', result)
            }
          }
        }
      }
    }
  }, 60000000)
})
