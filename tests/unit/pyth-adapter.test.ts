import { describe, test, expect, vi } from "vitest"
import { PythAdapter } from "~/pyth/adapter"

describe("PythAdapter", () => {
  test("reads package id from nested upgrade_cap fields", async () => {
    const client = {
      getObject: vi.fn().mockResolvedValue({
        data: {
          content: {
            fields: {
              upgrade_cap: {
                fields: {
                  package: "0xpackage",
                },
              },
            },
          },
        },
      }),
    }

    const adapter = new PythAdapter(client as any, "0xpyth", "0xwormhole", [])

    await expect(adapter.getPackageId("0xstate")).resolves.toBe("0xpackage")
  })

  test("returns the stored price feed object id instead of the dynamic field id", async () => {
    const client = {
      getDynamicFieldObject: vi.fn().mockResolvedValue({
        data: {
          objectId: "0xdynamic-field",
          content: {
            fields: {
              value: "0xprice-feed",
            },
          },
        },
      }),
    }

    const adapter = new PythAdapter(client as any, "0xpyth", "0xwormhole", [])
    vi.spyOn(adapter, "getPriceTableInfo").mockResolvedValue({
      id: "0xtable",
      fieldType: "0xpythpackage",
    })

    await expect(adapter.getPriceFeedObjectId("0x1234")).resolves.toBe("0xprice-feed")
    expect(client.getDynamicFieldObject).toHaveBeenCalledWith({
      parentId: "0xtable",
      name: {
        type: "0xpythpackage::price_identifier::PriceIdentifier",
        value: { bytes: [18, 52] },
      },
    })
  })
})
