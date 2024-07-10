import { describe, expect, test } from "@jest/globals"
import dotenv from "dotenv"
import { AggregatorClient } from "~/client"
import { AggregatorConfig, ENV } from "~/config"
import {
  M_CETUS,
  M_HASUI,
  M_NAVI,
  M_SUI,
  M_USDC,
  M_VAPOR,
  M_VSUI,
} from "../src/test_data.test"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { printTransaction } from "~/utils/transaction"
import BN from "bn.js"

dotenv.config()

export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = process.env.SUI_WALLET_MNEMONICS || ""
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

describe("router module", () => {
  let config: AggregatorConfig
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  beforeAll(() => {
    const fullNodeURL = process.env.SUI_RPC!
    const aggregatorURL = process.env.CETUS_AGGREGATOR!
    const secret = process.env.SUI_WALLET_SECRET!

    const byte = Buffer.from(secret, "base64")
    const u8Array = new Uint8Array(byte)
    keypair = secret
      ? Ed25519Keypair.fromSecretKey(u8Array.slice(1, 33))
      : buildTestAccount()

    const wallet = keypair.getPublicKey().toSuiAddress()
    // const wallet = "0xaabf2fedcb36146db164bec930b74a47969c4df98216e049342a3c49b6d11580"
    // const wallet = "0x410456cfc689666936b6bf80fbec958b69499b9f7183ecba07de577c17248a44"
    // const wallet = "0xca171941521153181ff729d53489eaae7e99c3f4692884afd7cca61154e4cec4"
    // console.log("wallet: ", wallet)

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

    config = new AggregatorConfig(
      aggregatorURL,
      fullNodeURL,
      wallet,
      [aggregatorPackage, integratePackage],
      ENV.MAINNET
    )
    client = new AggregatorClient(config)
  })

  test("Init aggregator client", () => {
    expect(config.getAggregatorUrl().length > 0).toBe(true)
    expect(config.getWallet().length > 0).toBe(true)
  })

  test("Get all coins", () => {
    return client.getAllCoins().then((coins) => {
      console.log(coins)
    })
  })

  test("Downgrade swap in route", async () => {
    const amount = 1000000

    const res = await client.swapInPools({
      from: M_NAVI,
      target: M_SUI,
      amount: new BN(amount),
      byAmountIn: false,
      pools: [
        "0x0254747f5ca059a1972cd7f6016485d51392a3fde608107b93bbaebea550f703",
      ],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }
  })

  test("Find router", async () => {
    const amount = "10000000000000000"

    const res = await client.findRouter({
      from: M_SUI,
      target: M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 1,
      splitAlgorithm: null,
      splitFactor: null,
      splitCount: 1,
      providers: ["AFTERMATH"],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())
  })

  test("Build router tx", async () => {
    const byAmountIn = true
    const amount = 10000000

    const from = M_SUI
    const target = M_USDC

    const res = await client.findRouter({
      from,
      target,
      amount: new BN(amount),
      byAmountIn,
      depth: 2,
      splitAlgorithm: null,
      splitFactor: null,
      splitCount: null,
      providers: ["AFTERMATH"],
    })

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
    }

    console.log("amount in", res?.amountIn.toString())
    console.log("amount out", res?.amountOut.toString())

    if (res != null) {
      console.log(JSON.stringify(res, null, 2))
      const routerTx = await client.routerSwap({
        routers: res.routes,
        amountIn: res.amountIn,
        amountOut: res.amountOut,
        byAmountIn,
        slippage: 0.01,
        fromCoinType: from,
        targetCoinType: target,
        partner: undefined,
        isMergeTragetCoin: true,
      })

      printTransaction(routerTx)

      let result = await client.devInspectTransactionBlock(routerTx, keypair)
      console.log("result", result)

      if (result.effects.status.status === "success") {
        console.log("Sim exec transaction success")
        const result = await client.signAndExecuteTransaction(routerTx, keypair)
        console.log("result", result)
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
          const res = await client.findRouter({
            from,
            target,
            amount: new BN(amount),
            byAmountIn,
            depth: null,
            splitAlgorithm: null,
            splitFactor: null,
            splitCount: null,
            providers: null,
          })

          if (res != null) {
            const routerTx = await client.routerSwap({
              routers: res.routes,
              amountIn: res.amountIn,
              amountOut: res.amountOut,
              byAmountIn,
              slippage: 0.01,
              fromCoinType: from,
              targetCoinType: target,
              partner: undefined,
              isMergeTragetCoin: true,
            })

            let result = await client.devInspectTransactionBlock(
              routerTx,
              keypair
            )
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
