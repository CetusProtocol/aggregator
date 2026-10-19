import { afterEach, describe, test, expect, vi } from "vitest"
import { PythAdapter } from "~/pyth/adapter"
import { bcs } from "@mysten/sui/bcs"

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

  test("checks Hermes endpoint availability", async () => {
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
})
