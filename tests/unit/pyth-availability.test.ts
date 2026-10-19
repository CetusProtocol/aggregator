import { afterEach, describe, expect, test, vi } from "vitest"
import { AggregatorClient, Env } from "~/index"

const ENDPOINT = "https://router.test"
const PYTH_URL = "https://hermes.pyth.network"
const CETUS_PYTH_URL =
  "https://api-sui.cetus.zone/v1/pyth/price-update-data"
const FROM_COIN = "0x2::sui::SUI"
const TARGET_COIN = "0x1::coin::COIN"

function makeRouterResponse() {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        data: {
          request_id: "quote",
          amount_in: "100",
          amount_out: "200",
          deviation_ratio: 0,
          packages: {},
          paths: [
            {
              id: "0xpool",
              direction: true,
              provider: "CETUS",
              from: FROM_COIN,
              target: TARGET_COIN,
              fee_rate: 0,
              amount_in: "100",
              amount_out: "200",
              version: "1",
              published_at: "0xpackage",
              extended_details: {},
            },
          ],
        },
      }),
  }
}

function makeClient(
  params: Partial<ConstructorParameters<typeof AggregatorClient>[0]> = {}
) {
  return new AggregatorClient({
    endpoint: ENDPOINT,
    env: Env.Mainnet,
    pythUrls: [PYTH_URL],
    ...params,
  })
}

function makeFindRouterParams(providers?: string[]) {
  return {
    from: FROM_COIN,
    target: TARGET_COIN,
    amount: "100",
    byAmountIn: true,
    providers,
  }
}

function fetchUrls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(call => String(call[0]))
}

describe("Pyth availability provider filtering", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test("does not check or filter Pyth providers without an interval", async () => {
    const fetchMock = vi.fn(async () => makeRouterResponse())
    vi.stubGlobal("fetch", fetchMock)

    const client = makeClient()
    await client.findRouters(makeFindRouterParams(["HAEDALPMM"]))

    const urls = fetchUrls(fetchMock)
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain("/find_routes")
    expect(urls[0]).toContain("providers=HAEDALPMM")
  })

  test("does not check Pyth availability when no Pyth provider is requested", async () => {
    const fetchMock = vi.fn(async () => makeRouterResponse())
    vi.stubGlobal("fetch", fetchMock)

    const client = makeClient({ pythAvailabilityCheckInterval: 10_000 })
    await client.findRouters(makeFindRouterParams(["CETUS"]))

    expect(fetchUrls(fetchMock)).toHaveLength(1)
    expect(fetchUrls(fetchMock)[0]).toContain("/find_routes")
    expect(fetchUrls(fetchMock)[0]).toContain("providers=CETUS")
  })

  test("filters Pyth oracle providers while cached availability is unavailable", async () => {
    let now = 1_000
    let pythAvailable = false
    vi.spyOn(Date, "now").mockImplementation(() => now)

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url === PYTH_URL || url === CETUS_PYTH_URL) {
        return { status: pythAvailable ? 200 : 503 }
      }
      return makeRouterResponse()
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = makeClient({ pythAvailabilityCheckInterval: 10_000 })

    await client.findRouters(
      makeFindRouterParams(["CETUS", "HAEDALPMM", "HAEDALPROPAMM"])
    )
    expect(
      fetchUrls(fetchMock).filter(url => url === CETUS_PYTH_URL)
    ).toHaveLength(1)
    expect(fetchUrls(fetchMock).at(-1)).toContain("providers=CETUS")
    expect(fetchUrls(fetchMock).at(-1)).not.toContain("HAEDALPMM")
    expect(fetchUrls(fetchMock).at(-1)).not.toContain("HAEDALPROPAMM")

    now = 5_000
    await client.findRouters(
      makeFindRouterParams(["CETUS", "HAEDALPMM", "HAEDALPROPAMM"])
    )
    expect(
      fetchUrls(fetchMock).filter(url => url === CETUS_PYTH_URL)
    ).toHaveLength(1)
    expect(fetchUrls(fetchMock).at(-1)).toContain("providers=CETUS")
    expect(fetchUrls(fetchMock).at(-1)).not.toContain("HAEDALPMM")
    expect(fetchUrls(fetchMock).at(-1)).not.toContain("HAEDALPROPAMM")

    now = 12_000
    pythAvailable = true
    await client.findRouters(
      makeFindRouterParams(["CETUS", "HAEDALPMM", "HAEDALPROPAMM"])
    )
    expect(
      fetchUrls(fetchMock).filter(url => url === CETUS_PYTH_URL)
    ).toHaveLength(2)
    expect(fetchUrls(fetchMock).at(-1)).toContain(
      "providers=CETUS,HAEDALPMM,HAEDALPROPAMM"
    )
  })

  test("returns an empty route result when all requested providers are filtered", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url === PYTH_URL || url === CETUS_PYTH_URL) {
        return { status: 503 }
      }
      return makeRouterResponse()
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = makeClient()
    const result = await client.findRouters({
      ...makeFindRouterParams(["HAEDALPROPAMM"]),
      pythAvailabilityCheckInterval: 10_000,
    })

    expect(result).toEqual({
      quoteID: "",
      amountIn: expect.anything(),
      amountOut: expect.anything(),
      paths: [],
      byAmountIn: true,
      insufficientLiquidity: true,
      deviationRatio: 0,
    })
    expect(fetchUrls(fetchMock)).toEqual([CETUS_PYTH_URL])
  })
})
