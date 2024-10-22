import { describe, test } from "@jest/globals"
import dotenv from "dotenv"
import { AggregatorClient } from "~/client"
import {
  M_CETUS,
  M_HASUI,
  M_MICHI,
  M_NAVI,
  M_SSWP,
  M_SUI,
  M_USDC,
  T_DBUSDC,
  T_DBUSDT,
  T_DEEP,
} from "./test_data.test"
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
    const secret = process.env.SUI_WALLET_SECRET!
    if (secret) {
      keypair = Ed25519Keypair.fromSecretKey(fromB64(secret).slice(1, 33))
    } else {
      keypair = buildTestAccount()
    }

    const wallet = keypair.getPublicKey().toSuiAddress()
    console.log("wallet: ", wallet)

    client = new AggregatorClient()
  })

  test("Get all coins", () => {
    return client.getAllCoins().then((coins) => {
      console.log(coins)
    })
  })

  test("Downgrade swap in route", async () => {
    const amount = 100000000
    const byAmountIn = true

    const res: any = await client.swapInPools({
      from: "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
      target:
        "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      amount: new BN(amount),
      byAmountIn,
      pools: [
        "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        "0x03d7739b33fe221a830ff101042fa81fd19188feca04a335f7dea4e37c0fca81",
        "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105",
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

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:114 ~ test ~ result:", result)
    }
  }, 60000)

  test("Find router", async () => {
    const amount = "4239267610000000000"
    const res = await client.findRouters({
      from: M_SUI,
      target: M_USDC,
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
    const amount = "32"
    const target = M_SUI
    const from = M_MICHI

    const res = await client.findRouters({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 3,
      providers: [
        "CETUS",
        // "DEEPBOOKV3",
        // "DEEPBOOK",
        // "AFTERMATH",
        // "FLOWX",
        // "KRIYA",
        // "KRIYAV3",
        // "TURBOS",
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
        payDeepFeeAmount: 0,
      })

      printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)

      if (result.effects.status.status === "success") {
        // console.log("Sim exec transaction success")
        const result = await client.signAndExecuteTransaction(txb, keypair)
        console.log("result", result)
      } else {
        console.log("result", result)
      }
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

  test("Build router with liquidity changes", async () => {
    const byAmountIn = true
    const amount = "1000000000"

    // const from = M_USDC
    // const target = M_SUI

    const from = M_SUI
    // const target =
    //   "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI"
    // const target =
    //   "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"

    const target = M_HASUI

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
