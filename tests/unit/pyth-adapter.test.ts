import { afterEach, describe, test, expect, vi } from "vitest"
import { PythAdapter } from "~/pyth/adapter"
import { bcs } from "@mysten/sui/bcs"
import { Transaction } from "@mysten/sui/transactions"
import { AggregatorClient, Env } from "~/index"

const CETUS_PYTH_URL =
  "https://api-sui.cetus.zone/v1/pyth/price-update-data"
const PRICE_SEED =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"

describe("PythAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test("reads package id from nested upgrade_cap fields", async () => {
    const client = {
      getObject: vi.fn().mockResolvedValue({
        object: {
          json: {
            upgrade_cap: {
              package: "0xpackage",
            },
          },
        },
      }),
    }

    const adapter = new PythAdapter(client as any, "0xpyth", "0xwormhole", [])

    await expect(adapter.getPackageId("0xstate")).resolves.toBe("0xpackage")
  })

  test("returns the stored price feed object id instead of the dynamic field id", async () => {
    const feedId = "0x1234"
    const normalizedFeedId = feedId.replace("0x", "")
    const feedIdBytes = Buffer.from(normalizedFeedId, "hex")

    // Build the expected object ID bytes (32 bytes for a Sui address)
    const objectIdHex = "abcd".padStart(64, "0")
    const objectIdBytes = new Uint8Array(Buffer.from(objectIdHex, "hex"))

    const client = {
      getDynamicField: vi.fn().mockResolvedValue({
        dynamicField: {
          value: {
            bcs: objectIdBytes,
          },
        },
      }),
    }

    const adapter = new PythAdapter(client as any, "0xpyth", "0xwormhole", [])
    vi.spyOn(adapter, "getPriceTableInfo").mockResolvedValue({
      id: "0xtable",
      fieldType: "0xpythpackage::price_identifier::PriceIdentifier",
    })

    const result = await adapter.getPriceFeedObjectId(feedId)
    expect(result).toBe("0x" + objectIdHex)

    // Verify getDynamicField was called with BCS-encoded name
    const PriceIdentifier = bcs.struct('PriceIdentifier', {
      bytes: bcs.vector(bcs.u8()),
    })
    const expectedBcs = PriceIdentifier.serialize({ bytes: Array.from(feedIdBytes) }).toBytes()

    expect(client.getDynamicField).toHaveBeenCalledWith({
      parentId: "0xtable",
      name: {
        type: "0xpythpackage::price_identifier::PriceIdentifier",
        bcs: expectedBcs,
      },
    })
  })

  test("falls back to public hermes when the configured endpoint is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 })
    vi.stubGlobal("fetch", fetchMock)

    const adapter = new PythAdapter(
      {} as any,
      "0xpyth",
      "0xwormhole",
      ["https://custom.hermes", "https://custom.hermes/"]
    )

    const snapshot = await adapter.checkHermesAvailability({ timeout: 50 })

    expect(adapter.getHermesUrls()).toEqual([
      "https://custom.hermes",
      "https://hermes.pyth.network",
    ])
    expect(snapshot.checked).toBe(true)
    expect(snapshot.availableUrls).toEqual(["https://hermes.pyth.network"])
    expect(snapshot.unavailableUrls).toEqual(["https://custom.hermes"])
  })

  test("priceUpdateData protocol appends no hermes fallback", async () => {
    const adapter = new PythAdapter(
      {} as any,
      "0xpyth",
      "0xwormhole",
      [CETUS_PYTH_URL],
      { protocol: "priceUpdateData" }
    )

    expect(adapter.getHermesUrls()).toEqual([CETUS_PYTH_URL])
  })

  test("recognizes the Cetus POST endpoint as available", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => ({
      status: String(input).startsWith(CETUS_PYTH_URL) ? 405 : 503,
    }))
    vi.stubGlobal("fetch", fetchMock)

    const adapter = new PythAdapter(
      {} as any,
      "0xpyth",
      "0xwormhole",
      [{ url: CETUS_PYTH_URL, apiKey: "test-api-key" }],
      { protocol: "priceUpdateData" }
    )

    const snapshot = await adapter.checkHermesAvailability({ timeout: 50 })

    expect(snapshot.availableUrls).toEqual([CETUS_PYTH_URL])
    expect(snapshot.unavailableUrls).toEqual([])
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CETUS_PYTH_URL}?apiKey=test-api-key`
    )
  })

  test("fetches base64 price updates from the Cetus Pyth endpoint without an API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ price_update_data: ["AQID"] }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const adapter = new PythAdapter(
      {} as any,
      "0xpyth",
      "0xwormhole",
      [CETUS_PYTH_URL],
      { protocol: "priceUpdateData" }
    )

    await expect(adapter.getPriceFeedsUpdateData([PRICE_SEED])).resolves.toEqual([
      Buffer.from([1, 2, 3]),
    ])
    expect(fetchMock).toHaveBeenCalledWith(CETUS_PYTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price_seeds: [PRICE_SEED],
        max_age_seconds: 30,
      }),
    })
  })

  test("sends each url its own API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })
    vi.stubGlobal("fetch", fetchMock)

    const adapter = new PythAdapter(
      {} as any,
      "0xpyth",
      "0xwormhole",
      [
        { url: CETUS_PYTH_URL, apiKey: "key-a" },
        { url: "https://my.endpoint/price-update-data", apiKey: "key-b" },
      ],
      { protocol: "priceUpdateData" }
    )

    await expect(adapter.getPriceFeedsUpdateData([PRICE_SEED])).rejects.toThrow()

    expect(fetchMock.mock.calls.map(c => String(c[0]))).toEqual([
      `${CETUS_PYTH_URL}?apiKey=key-a`,
      "https://my.endpoint/price-update-data?apiKey=key-b",
    ])
  })

  test("client binds its Cetus apiKey to the default v2 proxy url only", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ price_update_data: ["AQID"] }),
    })
    vi.stubGlobal("fetch", fetchMock)

    // No pythCoreV2 override → mainnet default = Cetus proxy + client apiKey
    const client = new AggregatorClient({
      apiKey: "test-api-key",
      client: {} as any,
      env: Env.Mainnet,
    })
    const adapter = (client as any).pythAdapterV2 as PythAdapter
    vi.spyOn(adapter, "updatePriceFeeds").mockResolvedValue(["0xprice"])

    await expect(
      client.updatePythCoreV2PriceIDs([PRICE_SEED], new Transaction())
    ).resolves.toEqual(new Map([[PRICE_SEED, "0xprice"]]))
    expect(fetchMock).toHaveBeenCalledWith(
      `${CETUS_PYTH_URL}?apiKey=test-api-key`,
      expect.any(Object)
    )
  })

  test("caller-provided v2 urls do NOT inherit the client apiKey", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ price_update_data: ["AQID"] }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = new AggregatorClient({
      apiKey: "cetus-key",
      client: {} as any,
      env: Env.Mainnet,
      pythCoreV2: {
        pythUrls: ["https://my.endpoint/price-update-data"],
        protocol: "priceUpdateData",
      },
    })
    const adapter = (client as any).pythAdapterV2 as PythAdapter
    vi.spyOn(adapter, "updatePriceFeeds").mockResolvedValue(["0xprice"])

    await client.updatePythCoreV2PriceIDs([PRICE_SEED], new Transaction())
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://my.endpoint/price-update-data"
    )
  })
})
