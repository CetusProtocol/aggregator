import { describe, expect, test, vi } from "vitest"
import BN from "bn.js"
import { Transaction } from "@mysten/sui/transactions"
import { AggregatorClient, Env } from "~/index"
import type { RouterDataV3 } from "~/types/shared"

const AGGREGATOR_V3_PACKAGE =
  "0x0422e3239f174320760dd675ba3835cf4b1c511be4a36e819cb61fab7d5d404a"
const HAEDALPROPAMM_PACKAGE =
  "0x7772ef0d131584e722d93f6e896f8a87d1e945a455bdc557092906e11cb3f324"
const POOL_ID =
  "0x622203f18e9b9650f89d4df0136b5686c74a540ca9e9a6bf80bfeb4712a23961"
const REGIME_ID =
  "0x31efece41ca5ad4a16e645988ed603b610713d6f75ab373b9f5d5c5d9f949603"
const BASE_SEED =
  "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744"
const QUOTE_SEED =
  "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
const STALE_BASE_PRICE_OBJECT =
  "0x801dbc2f0053d34734814b2d6df491ce7807a725fe9a01ad74a07e9c51396c37"
const STALE_QUOTE_PRICE_OBJECT =
  "0x5dec622733a204ca27f5a90d8c2fad453cc6665186fd5dff13a83d0b6c9027ab"
const UPDATED_BASE_PRICE_OBJECT =
  "0x1111111111111111111111111111111111111111111111111111111111111111"
const UPDATED_QUOTE_PRICE_OBJECT =
  "0x2222222222222222222222222222222222222222222222222222222222222222"
const SUI_TYPE =
  "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
const USDC_TYPE =
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"

function makeClient() {
  return new AggregatorClient({
    endpoint: "https://router.test",
    env: Env.Mainnet,
    signer:
      "0xf7b8d77dd06a6bb51c37ad3ce69e0a44c6f1064f52ac54606ef47763c8a71be6",
  })
}

function makeRouterData(
  extendedDetails: RouterDataV3["paths"][number]["extendedDetails"]
): RouterDataV3 {
  const packages = new Map<string, string>()
  packages.set("aggregator_v3", AGGREGATOR_V3_PACKAGE)

  return {
    quoteID: "quote",
    amountIn: new BN("10000000000"),
    amountOut: new BN("7495240"),
    byAmountIn: true,
    insufficientLiquidity: false,
    deviationRatio: 0,
    packages,
    paths: [
      {
        id: POOL_ID,
        direction: true,
        provider: "HAEDALPROPAMM",
        from: SUI_TYPE,
        target: USDC_TYPE,
        feeRate: 0,
        amountIn: "10000000000",
        amountOut: "7495240",
        publishedAt: HAEDALPROPAMM_PACKAGE,
        extendedDetails,
      },
    ],
  }
}

describe("HAEDALPROPAMM Pyth price updates", () => {
  test("collects HAEDALPROPAMM price seeds and swaps with updated price objects", async () => {
    const client = makeClient()
    const txb = new Transaction()
    const inputCoin = txb.object(
      "0x3333333333333333333333333333333333333333333333333333333333333333"
    )

    const updatePythPriceIDs = vi
      .spyOn(client, "updatePythPriceIDs")
      .mockResolvedValue(
        new Map([
          [BASE_SEED, UPDATED_BASE_PRICE_OBJECT],
          [QUOTE_SEED, UPDATED_QUOTE_PRICE_OBJECT],
        ])
      )

    await client.routerSwap({
      router: makeRouterData({
        haedalpropamm_pool_id: POOL_ID,
        haedalpropamm_regime_id: REGIME_ID,
        haedalpropamm_oracle_mode: "pyth_core",
        haedalpropamm_base_price_seed: BASE_SEED,
        haedalpropamm_quote_price_seed: QUOTE_SEED,
        haedalpropamm_base_price_info_object: STALE_BASE_PRICE_OBJECT,
        haedalpropamm_quote_price_info_object: STALE_QUOTE_PRICE_OBJECT,
      }),
      inputCoin,
      slippage: 0.05,
      txb,
    })

    expect(updatePythPriceIDs).toHaveBeenCalledWith(
      [BASE_SEED, QUOTE_SEED],
      txb
    )

    const txData = JSON.stringify(txb.getData())
    expect(txData).toContain(UPDATED_BASE_PRICE_OBJECT)
    expect(txData).toContain(UPDATED_QUOTE_PRICE_OBJECT)
    expect(txData).not.toContain(STALE_BASE_PRICE_OBJECT)
    expect(txData).not.toContain(STALE_QUOTE_PRICE_OBJECT)
  })

  test("fails clearly when HAEDALPROPAMM price seeds are missing", async () => {
    const client = makeClient()
    const txb = new Transaction()
    const inputCoin = txb.object(
      "0x3333333333333333333333333333333333333333333333333333333333333333"
    )

    vi.spyOn(client, "updatePythPriceIDs").mockResolvedValue(new Map())

    await expect(
      client.routerSwap({
        router: makeRouterData({
          haedalpropamm_pool_id: POOL_ID,
          haedalpropamm_regime_id: REGIME_ID,
          haedalpropamm_oracle_mode: "pyth_core",
          haedalpropamm_base_price_info_object: STALE_BASE_PRICE_OBJECT,
          haedalpropamm_quote_price_info_object: STALE_QUOTE_PRICE_OBJECT,
        }),
        inputCoin,
        slippage: 0.05,
        txb,
      })
    ).rejects.toThrow("HAEDALPROPAMM base price seed not found")
  })
})
