import { afterEach, describe, expect, test, vi } from "vitest"
import { Transaction } from "@mysten/sui/transactions"
import BN from "bn.js"
import { DipcoinRouter, DIPCOIN_GLOBAL } from "../../src/movecall/dipcoin"
import { Env } from "../../src/config"
import { AggregatorClient, ALL_DEXES } from "../../src/client"
import { getRouterResult } from "../../src/api"
import type { RouterDataV3 } from "../../src"
import type { FlattenedPath } from "../../src"

const pool = "0x7fbd7f609fcecd84329359cb6ea4eadbcd84d02a28fec9ce4652712d06474b3e"
const x = "0x2::sui::SUI"
const y = "0x3::usdc::USDC"
const productionRouter = "0x271d1f348eb3e8954de5f7ec3d1f933f4ff51bab30a2c27975d898411b1ff060"

afterEach(() => vi.unstubAllGlobals())

describe("DipCoin API compatibility", () => {
  test.each([false, true])("advertises compatible version and preserves production package (POST=%s)", async post => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const request = post ? JSON.parse(init!.body as string) : Object.fromEntries(new URL(url).searchParams)
      expect(Number(request.v)).toBeGreaterThanOrEqual(1010704)
      expect(request.providers.split(",")).toContain("DIPCOIN")
      return new Response(JSON.stringify({ code: 200, msg: "Success", data: {
        request_id: "dipcoin-production", amount_in: "1000", amount_out: "10", deviation_ratio: 0,
        paths: [{ id: pool, provider: "DIPCOIN", from: x, target: y, direction: true,
          fee_rate: 0.0005, amount_in: "1000", amount_out: "10", published_at: productionRouter,
          extended_details: { aux_shared_versions: { [pool]: 560713748, [DIPCOIN_GLOBAL]: 557604664 } } }],
        packages: { aggregator_v3: "0xffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9" },
      } }), { status: 200 })
    }))
    const result = await getRouterResult("https://example.com/router_v3", "", {
      from: x, target: y, amount: new BN(1000), byAmountIn: true, providers: ALL_DEXES,
      ...(post ? { liquidityChanges: [{ poolID: pool, ticklower: 0, tickUpper: 1, deltaLiquidity: 0 }] } : {}),
    }, 0, "0x0")
    expect(result?.paths[0].publishedAt).toBe(productionRouter)
    const tx = new Transaction()
    new DipcoinRouter(Env.Mainnet).swap(tx, {
      path: result!.paths[0], isLastUseOfIntermediateToken: false,
    } as FlattenedPath, tx.object("0x123"))
    expect(tx.getData().commands[0].MoveCall!.package).toBe(productionRouter)
  })
})

describe("DipCoin PTB", () => {
  test("fixed-output builder rejects DipCoin routes", () => {
    const client = new AggregatorClient({ env: Env.Mainnet, endpoint: "https://example.invalid" })
    const tx = new Transaction()
    const route = { quoteID: "test", byAmountIn: false, paths: [
      { id: pool, provider: "DIPCOIN", from: x, target: y, direction: true,
        feeRate: 0.0005, amountIn: "1000", amountOut: "10", publishedAt: "0xabc" },
    ] } as RouterDataV3

    expect(() => client.expectOutputSwapV3(tx, tx.object("0x123"), route, "1000", "10", 0.01))
      .toThrow("DipCoin only supports exact input")
  })

  test("fixed-output max-input builder rejects DipCoin routes", () => {
    const client = new AggregatorClient({ env: Env.Mainnet, endpoint: "https://example.invalid" })
    const tx = new Transaction()
    const route = { quoteID: "test", byAmountIn: false, paths: [
      { id: pool, provider: "DIPCOIN", from: x, target: y, direction: true,
        feeRate: 0.0005, amountIn: "1000", amountOut: "10", publishedAt: "0xabc" },
    ] } as RouterDataV3

    expect(() => client.expectOutputSwapV3WithMaxAmountIn(
      tx, tx.object("0x123"), route, new BN(1000), "1000", "10", 0.01
    )).toThrow("DipCoin only supports exact input")
  })

  test.each([true, false])("direction=%s and intermediate input", direction => {
    const router = new DipcoinRouter(Env.Mainnet)
    const tx = new Transaction()
    const path = {
      path: { id: pool, provider: "DIPCOIN", from: direction ? x : y, target: direction ? y : x,
        direction, feeRate: 0.0005, amountIn: "1000", amountOut: "10", publishedAt: "0xabc",
        extendedDetails: { aux_shared_versions: { [pool]: 560713748, [DIPCOIN_GLOBAL]: 557604664 } } },
      isLastUseOfIntermediateToken: true,
    } as FlattenedPath
    router.swap(tx, path, tx.object("0x123"))
    const data = tx.getData()
    const call = data.commands[0].MoveCall!
    expect(call.module).toBe("dipcoin")
    expect(call.function).toBe("swap")
    expect(call.typeArguments).toEqual([x,y])
    expect(call.arguments).toHaveLength(5)
    const global = data.inputs.find(input => input.Object?.SharedObject?.objectId === DIPCOIN_GLOBAL)
    expect(global?.Object?.SharedObject?.mutable).toBe(false)
    expect(global?.Object?.SharedObject?.initialSharedVersion).toBe(557604664)
    const input = data.inputs[(call.arguments[4] as { Input: number }).Input]
    expect(Buffer.from(input.Pure!.bytes, "base64").readBigUInt64LE()).toBe(18446744073709551615n)
    const client = new AggregatorClient({ env: Env.Mainnet, endpoint: "https://example.invalid" })
    const route = { quoteID: "test", byAmountIn: false, paths: [path.path] } as RouterDataV3
    expect(() => client.expectInputSwapV3(tx, tx.object("0x123"), route, "1000", "10", 0.01, new Map())).toThrow("exact input")
    path.path.publishedAt = undefined
    expect(() => router.swap(new Transaction(), path, tx.object("0x123"))).toThrow("publishedAt")
  })
})
