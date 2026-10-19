import { describe, test, expect } from "vitest"
import {
  ALL_DEXES,
  CETUS,
  CETUS_TIDE,
  DEEPBOOKV3,
  MAX_TIGHT_SLIPPAGE,
  TIGHT_SLIPPAGE_EXCLUDED_DEXES,
  filterProvidersBySlippage,
} from "~/client"

describe("filterProvidersBySlippage", () => {
  test("no slippage param leaves params untouched", () => {
    const params = { providers: [CETUS, CETUS_TIDE], byAmountIn: true }
    const result = filterProvidersBySlippage(params)
    expect(result.params).toBe(params)
    expect(result.providersExhausted).toBe(false)
  })

  test("slippage above 0.1% keeps CETUS_TIDE", () => {
    const params = { providers: [CETUS, CETUS_TIDE], slippage: 0.0011 }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([CETUS, CETUS_TIDE])
    expect(result.providersExhausted).toBe(false)
  })

  test("slippage exactly 0.1% removes CETUS_TIDE (inclusive threshold)", () => {
    const params = { providers: [CETUS, CETUS_TIDE], slippage: 0.001 }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([CETUS])
    expect(result.providersExhausted).toBe(false)
  })

  test("slippage below 0.1% removes CETUS_TIDE from explicit providers", () => {
    const params = {
      providers: [CETUS, CETUS_TIDE, DEEPBOOKV3],
      slippage: 0.0005,
    }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([CETUS, DEEPBOOKV3])
    expect(result.providersExhausted).toBe(false)
  })

  test("tight slippage without explicit providers expands ALL_DEXES minus excluded", () => {
    const params: { providers?: string[]; slippage: number; byAmountIn: boolean } =
      { slippage: 0.0009, byAmountIn: true }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual(
      ALL_DEXES.filter(p => !TIGHT_SLIPPAGE_EXCLUDED_DEXES.includes(p))
    )
    expect(result.params.providers).not.toContain(CETUS_TIDE)
    expect(result.providersExhausted).toBe(false)
  })

  test("filtering is case- and whitespace-insensitive", () => {
    const params = { providers: [" cetus_tide ", CETUS], slippage: 0.0005 }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([CETUS])
  })

  test("providersExhausted when only excluded providers were requested", () => {
    const params = { providers: [CETUS_TIDE], slippage: 0.0005 }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([])
    expect(result.providersExhausted).toBe(true)
  })

  test("zero slippage removes CETUS_TIDE", () => {
    const params = { providers: [CETUS, CETUS_TIDE], slippage: 0 }
    const result = filterProvidersBySlippage(params)
    expect(result.params.providers).toEqual([CETUS])
  })

  test("does not mutate the input params", () => {
    const providers = [CETUS, CETUS_TIDE]
    const params = { providers, slippage: 0.0005 }
    filterProvidersBySlippage(params)
    expect(params.providers).toEqual([CETUS, CETUS_TIDE])
  })

  test("invalid slippage values throw", () => {
    expect(() =>
      filterProvidersBySlippage({ slippage: -0.01 })
    ).toThrow()
    expect(() => filterProvidersBySlippage({ slippage: 1 })).toThrow()
    expect(() => filterProvidersBySlippage({ slippage: NaN })).toThrow()
  })

  test("threshold constant is 0.1%", () => {
    expect(MAX_TIGHT_SLIPPAGE).toBe(0.001)
  })
})
