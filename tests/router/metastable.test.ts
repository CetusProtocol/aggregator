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

describe("Test metastable provider", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair

  const T_SUPER_SUI = "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI"
  const T_SUI = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  const AF_SUI = "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI"

  const WH_USDC = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"
  const T_USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
  const M_USDC = "0xe44df51c0b21a27ab915fa1fe2ca610cd3eaa6d9666fe5e62b988bf7f0bd8722::musd::MUSD"

  const METH = "0xccd628c2334c5ed33e6c47d6c21bb664f8b6307b2ac32c2462a61f69a31ebcee::meth::METH"
  const ETH = "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH"
  const WEHT = "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN"

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
    // const wallet =
    //   "0x5cade8f29891e04c5f6e5ad3a020583fda51c8267f1b0c0fa5a85158d486ac3b"  // has 1 meth

    const wallet = "0x80cda5d0baa1e33ad073f590f8e6dc00a8d3657663ce06ce08c18ecbb0e47031" // has 80 eth

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

  test("Find Routers --> SUI -> SUPER_SUI", async () => {
    // const amounts = ["1000", "1000000", "100000000", "5000000000", "10000000000000"]
    const amounts = ["999000000", "5000000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: T_SUI,
        target: T_SUPER_SUI,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
        // printTransaction(txb)
  
        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }
    }
  })

  test("Find Routers --> SUPER_SUI --> SUI", async () => {
    // const amounts = ["1000", "1000000", "100000000", "5000000000", "10000000000000"]
    const amounts = ["1000", "1000000", "900000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: T_SUPER_SUI,
        target: T_SUI,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
          routers: res,
          txb,
          slippage: 0.01,
          refreshAllCoins: true,
          payDeepFeeAmount: 0,
        })
  
        txb.setSender(client.signer)
        const buildTxb = await txb.build({ client: client.client })
        // const buildTxb = await txb.getData()

        // printTransaction(txb)
  
        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }
    }
  })

  test("Find Routers --> USDC -> MUSDC", async () => {
    const amounts = ["1000000", "30000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: T_USDC,
        target: M_USDC,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
          routers: res,
          txb,
          slippage: 0.01,
          refreshAllCoins: true,
          payDeepFeeAmount: 0,
        })  
        txb.setSender(client.signer)

        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }
    }
  })

  test("Find Routers --> MUSDC -> USDC", async () => {
    // const amounts = ["1000", "1000000", "100000000", "5000000000", "10000000000000"]
    const amounts = ["1000000", "1000000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: M_USDC,
        target: T_USDC,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
          routers: res,
          txb,
          slippage: 0.01,
          refreshAllCoins: true,
          payDeepFeeAmount: 0,
        })  
        txb.setSender(client.signer)

        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }

    }
  })

  test("Find Routers --> METH -> ETH", async () => {
    const amounts = ["5000000", "100000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: METH,
        target: ETH,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
          routers: res,
          txb,
          slippage: 0.01,
          refreshAllCoins: true,
          payDeepFeeAmount: 0,
        })  
        txb.setSender(client.signer)

        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }
    }
  })

  test("Find Routers --> ETH -> METH", async () => {
    const amounts = ["10000000", "5000000000"]
    
    for (const amount of amounts) {
      const res = await client.findRouters({
        from: ETH,
        target: METH,
        amount: new BN(amount),
        byAmountIn: true,
        depth: 3,
        splitCount: 1,
        providers: ["METASTABLE"],
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
          routers: res,
          txb,
          slippage: 0.01,
          refreshAllCoins: true,
          payDeepFeeAmount: 0,
        })  
        txb.setSender(client.signer)

        let result = await client.devInspectTransactionBlock(txb)
        console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
        for (const event of result.events) {
          console.log("event", JSON.stringify(event, null, 2))
        }
      }
    }
  })

  test("Build Router TX", async () => {
    const amount = "10000000"

    const res = await client.findRouters({
      from: T_USDC,
      target: M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      depth: 3,
      providers: ["METASTABLE"],
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
      // printTransaction(txb)

      let result = await client.devInspectTransactionBlock(txb)
      console.log("🚀 ~ file: router.test.ts:180 ~ test ~ result:", result)
      for (const event of result.events) {
        console.log("event", JSON.stringify(event, null, 2))
      }

      // if (result.effects.status.status === "success") {
      //   const result = await client.signAndExecuteTransaction(txb, keypair)
      //   console.log("result", result)
      // } else {
      //   console.log("result", result)
      // }
    }
  }, 600000)
})
