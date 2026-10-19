import { describe, expect, test } from "vitest"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
  dealWithFastRouterSwapParamsForMsafe,
  restituteMsafeFastRouterSwapParams,
} from "~/utils/msafe"

describe("MSafe helpers", () => {
  test("serializes and restores router packages as a Map", () => {
    const router = {
      amountIn: new BN("1000000000"),
      amountOut: new BN("950000"),
      packages: new Map([
        ["aggregator_v3", "0xaggregator"],
        ["cetus_router", "0xcetus"],
      ]),
      paths: [
        {
          id: "pool-1",
          amountIn: new BN("1000000000"),
          amountOut: new BN("950000"),
          initialPrice: new Decimal("1.23"),
          extendedDetails: {
            after_sqrt_price: new Decimal("2.34"),
            haedal_pmm_base_price_seed: "0xseed",
          },
        },
      ],
    }

    const msafeParams = dealWithFastRouterSwapParamsForMsafe(router)
    const jsonParams = JSON.parse(JSON.stringify(msafeParams))
    const restored = restituteMsafeFastRouterSwapParams(jsonParams)

    expect(msafeParams.packages).toEqual({
      aggregator_v3: "0xaggregator",
      cetus_router: "0xcetus",
    })
    expect(restored.packages).toBeInstanceOf(Map)
    expect(restored.packages.get("aggregator_v3")).toBe("0xaggregator")
    expect(restored.amountIn.toString()).toBe("1000000000")
    expect(restored.amountOut.toString()).toBe("950000")
    expect(restored.paths[0].initialPrice.toString()).toBe("1.23")
    expect(restored.paths[0].extendedDetails.after_sqrt_price.toString()).toBe(
      "2.34"
    )
    expect(restored.paths[0].extendedDetails.haedal_pmm_base_price_seed).toBe(
      "0xseed"
    )
  })

  test("restores packages from entry arrays", () => {
    const restored = restituteMsafeFastRouterSwapParams({
      amountIn: "1",
      amountOut: "2",
      packages: [["aggregator_v3", "0xaggregator"]],
      paths: [],
    })

    expect(restored.packages).toBeInstanceOf(Map)
    expect(restored.packages.get("aggregator_v3")).toBe("0xaggregator")
  })
})
