import BN from "bn.js"
import { describe, expect, test } from "vitest"
import { AggregatorClient } from "../../src/client"
import { Env } from "../../src/config"

const MAINNET_AGGREGATOR_V3_PACKAGE =
  "0xffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9"
const MAINNET_CETUS_V3_PACKAGE =
  "0xd7b0cfc33a3b46c0ae0e2584c44028385da11724d4c94ec5b21a78117c5c1ab9"

describe("degraded route package", () => {
  test("uses the mainnet aggregator package that supports v3 swap guards", async () => {
    const suiClient = {
      simulateTransaction: async () => ({
        $kind: "Transaction",
        Transaction: {
          status: { success: true },
          events: [
            {
              eventType: "CalculatedSwapResultEvent",
              json: {
                data: {
                  amount_in: "100",
                  amount_out: "200",
                  fee_amount: "0",
                  fee_rate: "0",
                  is_exceed: false,
                },
              },
            },
          ],
        },
      }),
      getCoinMetadata: async () => ({
        coinMetadata: { decimals: 9 },
      }),
    }
    const client = new AggregatorClient({
      endpoint: "https://example.com",
      signer: "0x1",
      client: suiClient as never,
      env: Env.Mainnet,
    })

    const result = await client.swapInPools({
      from: "0x2::sui::SUI",
      target:
        "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      amount: new BN(100),
      byAmountIn: true,
      pools: ["0x2"],
    })

    expect(result.routeData?.packages?.get("aggregator_v3")).toBe(
      MAINNET_AGGREGATOR_V3_PACKAGE
    )
    expect(result.routeData?.paths[0].publishedAt).toBe(
      MAINNET_CETUS_V3_PACKAGE
    )
  })
})
