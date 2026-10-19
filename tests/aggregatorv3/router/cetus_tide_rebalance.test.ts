import dotenv from "dotenv"
import BN from "bn.js"
import { SuiGrpcClient } from "@mysten/sui/grpc"
import { Transaction } from "@mysten/sui/transactions"
import { describe, expect, test } from "vitest"
import { AggregatorClient, Env } from "~/index"
import { unwrapSimulation } from "./setup"

dotenv.config()

const requiredEnvNames = [
  "CETUS_AGGREGATOR_V3",
  "SUI_RPC",
  "PQF_REBALANCE_API_KEY",
  "PQF_REBALANCE_SENDER",
  "PQF_REBALANCE_AMOUNT",
  "PQF_REBALANCE_PROVIDERS",
  "PQF_V2_PACKAGE_ID",
  "PQF_V2_VERSIONED_ID",
  "PQF_V2_GLOBAL_CONFIG_ID",
  "PQF_V2_MM_ID",
  "PQF_V2_POOL_ID",
  "PQF_V2_BASE_COIN_TYPE",
  "PQF_V2_QUOTE_COIN_TYPE",
] as const

const missingEnvNames = requiredEnvNames.filter(name => !process.env[name])
const describeConfigured = missingEnvNames.length === 0 ? describe : describe.skip

describeConfigured("PQF orderbook V2 rebalance (configured dry-run)", () => {
  test("gets a signed route and simulates begin -> swap -> finish", async () => {
    const baseCoinType = process.env.PQF_V2_BASE_COIN_TYPE!
    const quoteCoinType = process.env.PQF_V2_QUOTE_COIN_TYPE!
    const from = process.env.PQF_REBALANCE_FROM ?? baseCoinType
    const target = process.env.PQF_REBALANCE_TARGET ?? quoteCoinType
    const providers = process.env.PQF_REBALANCE_PROVIDERS!.split(",")
      .map(provider => provider.trim())
      .filter(Boolean)

    const suiClient = new SuiGrpcClient({
      network: "mainnet",
      baseUrl: process.env.SUI_RPC!,
    })
    const client = new AggregatorClient({
      endpoint: process.env.CETUS_AGGREGATOR_V3!,
      signer: process.env.PQF_REBALANCE_SENDER!,
      client: suiClient,
      env: Env.Mainnet,
      apiKey: process.env.PQF_REBALANCE_API_KEY!,
    })

    const router = await client.findRebalanceRouters({
      from,
      target,
      amount: new BN(process.env.PQF_REBALANCE_AMOUNT!),
      byAmountIn: true,
      depth: Number(process.env.PQF_REBALANCE_DEPTH ?? 3),
      providers,
    })

    expect(router, "rebalance route response missing").not.toBeNull()
    expect(router?.error, router?.error?.msg).toBeUndefined()
    expect(router?.paths.length, "rebalance route paths missing").toBeGreaterThan(0)
    expect(router?.rebalanceQuoteBcs, "rebalance quote BCS missing").toBeDefined()
    expect(
      router?.rebalanceQuoteSignature,
      "rebalance quote signature missing"
    ).toBeDefined()

    const tx = new Transaction()
    await client.rebalanceSwap({
      router: router!,
      slippage: Number(process.env.PQF_REBALANCE_SLIPPAGE ?? 0.01),
      txb: tx,
      pqfPublishedAt: process.env.PQF_V2_PACKAGE_ID!,
      versionedObjectId: process.env.PQF_V2_VERSIONED_ID!,
      globalConfigObjectId: process.env.PQF_V2_GLOBAL_CONFIG_ID!,
      marketMakerObjectId: process.env.PQF_V2_MM_ID!,
      poolObjectId: process.env.PQF_V2_POOL_ID!,
      baseCoinType,
      quoteCoinType,
    })

    const moveCalls = tx
      .getData()
      .commands.map(command => command.MoveCall)
      .filter(call => call != null)
    expect(
      moveCalls.some(call => call!.function.startsWith("begin_rebalance_")),
      "begin_rebalance command missing"
    ).toBe(true)
    expect(
      moveCalls.some(call => call!.function.startsWith("finish_rebalance_")),
      "finish_rebalance command missing"
    ).toBe(true)

    const result = unwrapSimulation(await client.devInspectTransactionBlock(tx))
    expect(
      result.success,
      result.error ? JSON.stringify(result.error) : undefined
    ).toBe(true)
    expect(
      result.events.some(event =>
        event.eventType.endsWith("::orderbook_v2::RebalanceExecutedEvent")
      ),
      "RebalanceExecutedEvent missing"
    ).toBe(true)
  }, 600000)
})

if (missingEnvNames.length > 0) {
  console.info(
    `[SKIP] PQF V2 rebalance dry-run requires: ${missingEnvNames.join(", ")}`
  )
}
