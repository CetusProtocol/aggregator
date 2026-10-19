import { describe, expect, test } from "vitest"
import { Transaction } from "@mysten/sui/transactions"
import BN from "bn.js"
import { AggregatorClient } from "../../src/client"
import { Env } from "../../src/config"
import {
  confirmSwapV3,
  newSwapContextV3,
} from "../../src/movecall/router"

const AGGREGATOR_PACKAGE = "0xabc"
const FROM_COIN = "0x2::from::FROM"
const TARGET_COIN = "0x2::target::TARGET"

function u64Argument(tx: Transaction, argument: unknown): bigint {
  const inputIndex = (argument as { Input: number }).Input
  const input = tx.getData().inputs[inputIndex] as {
    Pure: { bytes: string }
  }
  return Buffer.from(input.Pure.bytes, "base64").readBigUInt64LE()
}

describe("aggregator v3 dynamic slippage move calls", () => {
  test("creates a v3 swap context with quote amounts and slippage", () => {
    const tx = new Transaction()

    newSwapContextV3(
      {
        quoteID: "quote-id",
        fromCoinType: FROM_COIN,
        targetCoinType: TARGET_COIN,
        maxAmountIn: 100n,
        quoteAmountIn: 100n,
        quoteAmountOut: 200n,
        slippage: 10_000,
        inputCoin: tx.object("0x1"),
        feeRate: 0,
        feeRecipient: "0x0",
        aggregatorPublishedAt: AGGREGATOR_PACKAGE,
      },
      tx
    )

    const command = tx.getData().commands[0].MoveCall
    expect(command?.function).toBe("new_swap_context_v3")
    expect(command?.arguments).toHaveLength(8)
  })

  test("confirms a v3 swap context", () => {
    const tx = new Transaction()
    const swapContext = newSwapContextV3(
      {
        quoteID: "quote-id",
        fromCoinType: FROM_COIN,
        targetCoinType: TARGET_COIN,
        maxAmountIn: 100n,
        quoteAmountIn: 100n,
        quoteAmountOut: 200n,
        slippage: 10_000,
        inputCoin: tx.object("0x1"),
        feeRate: 0,
        feeRecipient: "0x0",
        aggregatorPublishedAt: AGGREGATOR_PACKAGE,
      },
      tx
    )

    confirmSwapV3(
      {
        swapContext,
        targetCoinType: TARGET_COIN,
        aggregatorPublishedAt: AGGREGATOR_PACKAGE,
      },
      tx
    )

    const command = tx.getData().commands[1].MoveCall
    expect(command?.function).toBe("confirm_swap_v3")
  })
})

describe("AggregatorClient dynamic slippage", () => {
  function setupClient() {
    const client = new AggregatorClient({
      endpoint: "https://example.com",
      signer: "0x1",
      client: {} as never,
      env: Env.Mainnet,
    })

    ;(client as any).preparePythPriceInfoObjects = async () => ({
      legacy: new Map(),
      coreV2: new Map(),
    })
    ;(client as any).newDexRouterV3 = () => ({
      swap: () => undefined,
    })

    return client
  }

  const router = {
    quoteID: "quote-id",
    amountIn: new BN(100),
    amountOut: new BN(200),
    byAmountIn: true,
    paths: [
      {
        id: "0x2",
        direction: true,
        provider: "TEST",
        from: FROM_COIN,
        target: TARGET_COIN,
        feeRate: 0,
        amountIn: "100",
        amountOut: "200",
      },
    ],
    insufficientLiquidity: false,
    deviationRatio: 0,
    packages: new Map([["aggregator_v3", AGGREGATOR_PACKAGE]]),
  }

  test("builds router swaps with quote amounts and ppm slippage", async () => {
    const client = setupClient()
    const tx = new Transaction()

    await client.routerSwap({
      router,
      inputCoin: tx.object("0x1"),
      slippage: 0.01,
      txb: tx,
    })

    const create = tx.getData().commands[0].MoveCall!
    const confirm = tx.getData().commands[1].MoveCall!
    expect(create.function).toBe("new_swap_context_v3")
    expect(u64Argument(tx, create.arguments[2])).toBe(100n)
    expect(u64Argument(tx, create.arguments[3])).toBe(200n)
    expect(u64Argument(tx, create.arguments[4])).toBe(10_000n)
    expect(confirm.function).toBe("confirm_swap_v3")
  })

  test("rejects 100% slippage because the contract requires less than 100%", async () => {
    const client = setupClient()

    await expect(
      client.routerSwap({
        router,
        inputCoin: new Transaction().object("0x1"),
        slippage: 1,
        txb: new Transaction(),
      })
    ).rejects.toThrow("Invalid slippage")
  })
})
