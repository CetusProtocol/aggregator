import { describe, test } from "@jest/globals"
import dotenv from "dotenv"
import { AggregatorClient } from "~/client"
import * as testData from "./test_data.test"
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

    const wallet = keypair.getPublicKey().toSuiAddress()
    console.log("wallet: ", wallet)

    // // const endpoint =
    // //   "https://api-sui-cloudfront.cetus.zone/router_v2/find_routes"
    const endpoint = aggregatorURL

    const suiClient = new SuiClient({
      url: fullNodeURL,
    })
    // const suiClient = new SuiClient({
    //   url: "https://fullnode.testnet.sui.io:443",
    // })

    client = new AggregatorClient(endpoint, wallet, suiClient, Env.Mainnet)
  })

  test("Get coins", () => {
    return client.getCoins(testData.M_wUSDC).then((coins) => {
      console.log(coins)
    })
  })

  test("Downgrade swap in route", async () => {
    const amount = 1000000
    const byAmountIn = true

    const res: any = await client.swapInPools({
      from: testData.M_USDC,
      target: testData.M_SUI,
      amount: new BN(amount),
      byAmountIn,
      pools: [
        '0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105'
      ],
    })

    console.log("res", res)

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

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:114 ~ test ~ result:", result)
    }
  }, 60000)

  test("Find router", async () => {
    const amount = "4239267610000000000"
    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      splitCount: 1,
      providers: ["CETUS"],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }
    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())
  })

  test("Build router tx", async () => {
    const byAmountIn = true
    const amount = "400000000000"
    const from = "0x2::sui::SUI"
    const target = "0xaf3aae4940a248739ce4964857381fc3f3149a6d05375bfbb2118592907e3bbb::dam::DAM"

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 3,
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
        // partner: "0x1f5fa5c820f40d43fc47815ad06d95e40a1942ff72a732a92e8ef4aa8cde70a5",
        refreshAllCoins: true,
        payDeepFeeAmount: 0,
      })

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
      for (const event of result.events) {
        console.log("event", JSON.stringify(event, null, 2))
      }
      console.log("txb", )

      // if (result.effects.status.status === "success") {
      //   // console.log("Sim exec transaction success")
      //   const result = await client.signAndExecuteTransaction(txb, keypair)
      //   console.log("result", result)
      // } else {
      //   console.log("result", result)
      // }
    }
  }, 600000)

  test("By amount out", async () => {
    const byAmountIn = false
    const amount = "10000000000"

    const from = testData.M_USDC
    const target = testData.M_SSWP

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
    const froms = [testData.M_USDC, testData.M_SUI, testData.M_CETUS, testData.M_NAVI]
    const tos = [testData.M_SUI, testData.M_USDC, testData.M_USDC, testData.M_SUI]

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

  test("Build router with liquidity changes", async () => {
    const byAmountIn = true
    const amount = "1000000000"

    // const from = M_USDC
    // const target = M_SUI

    const from = testData.M_SUI
    // const target =
    //   "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"
    // const target =
    //   "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"

    const target = testData.M_HASUI

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 2,
      providers: [
        "CETUS",
        // "DEEPBOOK",
        // "AFTERMATH",
        // "FLOWX",
        // "KRIYA",
        // "KRIYAV3",
        // "TURBOS",
        // "FLOWXV3",
      ],
      liquidityChanges: [
        {
          poolID:
            "0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc",
          ticklower: 100,
          tickUpper: 394,
          deltaLiquidity: -5498684,
        },
        {
          poolID:
            "0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc",
          ticklower: 100,
          tickUpper: 394,
          deltaLiquidity: 986489,
        },
      ],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }

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

  test("Get deepbook v3 config", async () => {
    const config = await client.getDeepbookV3Config()
    console.log("config", config)
  }, 60000)
})
