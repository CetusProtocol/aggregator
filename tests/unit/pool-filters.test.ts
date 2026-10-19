import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { getMergeSwapResult, getRebalanceRouterResult, getRouterResult } from "~/api"
import { AggregatorClient, Env } from "~/index"
import type { FindRouterParams } from "~/types/shared"

const ENDPOINT = "https://router.test/router_v3"
const FROM = "0x2::sui::SUI"
const TARGET = "0x3::coin::COIN"
const fetchMock = vi.fn()
type PoolOptions = Pick<FindRouterParams, "includePools" | "excludePools">
const params = { from: FROM, target: TARGET, amount: "100", byAmountIn: true, providers: ["CETUS"] }
const liquidityChanges = [{ poolID: "0x9", ticklower: -10, tickUpper: 10, deltaLiquidity: 100 }]

function data(id = "0x9") {
  return { request_id: "quote-1", amount_in: "100", amount_out: "90", deviation_ratio: 0,
    packages: {}, paths: [{ id, provider: "CETUS", from: FROM, target: TARGET, direction: true,
      fee_rate: 0, amount_in: "100", amount_out: "90", published_at: "0x4" }] }
}
function rebalanceData() {
  return { ...data(), rebalance_quote_bcs: "0x01", rebalance_quote_signature: "0x02",
    rebalance_quote: { domain: "PQF_REBALANCE_QUOTE_V1", coin_in: FROM, coin_out: TARGET,
      amount_in: "100", amount_out: "90", issued_at_ms: "1", expiry_ms: "2", signer_version: "1" } }
}
function response(value: unknown) {
  return new Response(JSON.stringify({ code: 200, msg: "Success", data: value }))
}
function requestFields(index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return init?.method === "POST" ? JSON.parse(init.body) : Object.fromEntries(new URL(url).searchParams)
}

const transports = [
  { name: "GET", invoke: (p: PoolOptions) => getRouterResult(ENDPOINT, "", { ...params, ...p }, 0, "0x0"), data },
  { name: "POST", invoke: (p: PoolOptions) => getRouterResult(ENDPOINT, "", { ...params, ...p, liquidityChanges }, 0, "0x0"), data },
  { name: "merge", invoke: (p: PoolOptions) => getMergeSwapResult(ENDPOINT, "", {
    target: TARGET, byAmountIn: true, providers: ["CETUS"], froms: [{ coinType: FROM, amount: "100" }], ...p,
  }, 0, "0x0"), data: () => ({ request_id: "merge", total_amount_out: "180", all_routes: [data(), data("0x8")] }) },
  { name: "rebalance", invoke: (p: PoolOptions) => getRebalanceRouterResult(ENDPOINT, "api-key", { ...params, ...p }), data: rebalanceData },
]

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => response(data()))
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "log").mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe("pool filter forwarding", () => {
  test.each(transports)("$name forwards both lists as CSV without modifying their values", async transport => {
    fetchMock.mockImplementation(async () => response(transport.data()))
    const filters = { includePools: [" 0XAB ", "logical::POOL", "0x9"], excludePools: ["0x1", "pool-avoid"] }
    await transport.invoke(filters)
    expect(requestFields()).toMatchObject({
      include_pools: " 0XAB ,logical::POOL,0x9", exclude_pools: "0x1,pool-avoid", providers: "CETUS",
    })
    expect(filters.includePools).toEqual([" 0XAB ", "logical::POOL", "0x9"])
    expect(filters.excludePools).toEqual(["0x1", "pool-avoid"])
    if (transport.name === "POST") {
      expect(requestFields().liquidity_changes).toEqual([{ pool: "0x9", tick_lower: -10, tick_upper: 10, delta_liquidity: 100 }])
    } else {
      expect(String(fetchMock.mock.calls[0][0])).toContain("%2C")
    }
    if (transport.name === "rebalance") {
      expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/router_v3/rebalance/find_routes")
      expect(requestFields().apikey).toBe("api-key")
    }
  })

  test.each(transports)("$name preserves requests and results when lists are omitted or empty", async transport => {
    fetchMock.mockImplementation(async () => response(transport.data()))
    const before = await transport.invoke({})
    expect(await transport.invoke({ includePools: [], excludePools: [] })).toEqual(before)
    expect(fetchMock.mock.calls[0]).toEqual(fetchMock.mock.calls[1])
    expect(requestFields()).not.toHaveProperty("include_pools")
    expect(requestFields()).not.toHaveProperty("exclude_pools")
  })

  test.each(transports)("$name delegates invalid IDs and list limits to the server", async transport => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ code: 4000, msg: "invalid pools", data: null })))
    const filters = { includePools: ["0xzz"], excludePools: Array(51).fill("a".repeat(90)) }
    const result = await transport.invoke(filters)
    expect(result?.error).toBeDefined()
    expect(requestFields().include_pools).toBe("0xzz")
    expect(requestFields().exclude_pools).toBe(filters.excludePools.join(","))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test.each(transports)("$name returns server paths without additional pool-policy checks", async transport => {
    fetchMock.mockImplementation(async () => response(transport.data()))
    const result = await transport.invoke({ includePools: ["pool-allowed"], excludePools: ["0x9"] })
    const paths = result && "allRoutes" in result ? result.allRoutes.flatMap(route => route.paths) : result?.paths
    expect(paths?.map(path => path.id)).toEqual(transport.name === "merge" ? ["0x9", "0x8"] : ["0x9"])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test.each(["includePools", "excludePools"] as const)("forwards %s independently", async key => {
    await getRouterResult(ENDPOINT, "", { ...params, [key]: ["0x9", "0x1"] }, 0, "0x0")
    const field = key === "includePools" ? "include_pools" : "exclude_pools"
    expect(requestFields()[field]).toBe("0x9,0x1")
    expect(requestFields()).not.toHaveProperty(field === "include_pools" ? "exclude_pools" : "include_pools")
  })

  test("keeps server no-route errors without retrying", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ code: 5010, msg: "no route", data: null })))
    const result = await getRouterResult(ENDPOINT, "", { ...params, includePools: ["unknown-pool"] }, 0, "0x0")
    expect(result?.error).toBeDefined()
    expect(result?.paths).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test("preserves exact-out mode with both pool lists", async () => {
    const result = await getRouterResult(ENDPOINT, "", {
      ...params, byAmountIn: false, includePools: ["0x9"], excludePools: ["0x1"],
    }, 0, "0x0")
    expect(result?.byAmountIn).toBe(false)
    expect(requestFields()).toMatchObject({ by_amount_in: "false", include_pools: "0x9", exclude_pools: "0x1" })
  })

  test("client methods retain both options through provider filtering, merge and rebalance", async () => {
    const client = new AggregatorClient({ endpoint: ENDPOINT, env: Env.Mainnet, apiKey: "key" })
    const filters = { includePools: ["0x9"], excludePools: ["0x1"] }
    await client.findRouters({ ...params, ...filters, providers: ["CETUS", "CETUS_TIDE"], slippage: 0.0005 })
    expect(requestFields()).toMatchObject({ providers: "CETUS", include_pools: "0x9", exclude_pools: "0x1" })
    fetchMock.mockImplementation(async () => response({ request_id: "merge", total_amount_out: "90", all_routes: [data()] }))
    await client.findMergeSwapRouters({ target: TARGET, byAmountIn: true, froms: [{ coinType: FROM, amount: "100" }], ...filters })
    expect(requestFields(1)).toMatchObject({ include_pools: "0x9", exclude_pools: "0x1" })
    fetchMock.mockImplementation(async () => response(rebalanceData()))
    expect((await client.findRebalanceRouters({ ...params, ...filters }))?.rebalanceQuoteBcs).toBe("0x01")
    expect(requestFields(2)).toMatchObject({ include_pools: "0x9", exclude_pools: "0x1" })
  })
})
