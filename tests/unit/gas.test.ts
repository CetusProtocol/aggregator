import { describe, test, expect } from "vitest"
import BN from "bn.js"
import {
  extractGasMetrics,
  calculateGasEfficiency,
  calculatePriceImpact,
  compareGasMetrics,
  formatGasMetrics,
  exportToJSON,
  exportToCSV,
  type SimulateTransactionResult,
  type SwapGasAnalysis,
  type GasMetrics,
} from "~/utils/gas"

function makeSuccessResult(gasUsed: {
  computationCost: string
  storageCost: string
  storageRebate: string
  nonRefundableStorageFee: string
}): SimulateTransactionResult {
  return {
    effects: {
      status: { status: 'success' },
      gasUsed,
    },
  }
}

function makeFailureResult(errorMsg: string): SimulateTransactionResult {
  return {
    error: errorMsg,
    effects: {
      status: { status: 'failure', error: errorMsg },
      gasUsed: {
        computationCost: "1000",
        storageCost: "500",
        storageRebate: "200",
        nonRefundableStorageFee: "100",
      },
    },
  }
}

function makeAnalysis(overrides: Partial<SwapGasAnalysis> = {}): SwapGasAnalysis {
  return {
    gasMetrics: {
      computationCost: "1000000",
      storageCost: "500000",
      storageRebate: "200000",
      nonRefundableStorageFee: "50000",
      totalGasCost: "1350000",
      gasUsed: "1000000",
      gasPrice: "1000",
      success: true,
    },
    amountIn: new BN("1000000000"),
    amountOut: new BN("500000000"),
    priceImpact: 0.5,
    gasEfficiency: 370,
    provider: "CETUS",
    route: ["SUI", "USDC"],
    timestamp: Date.now(),
    ...overrides,
  }
}

describe("Gas Utilities", () => {
  describe("extractGasMetrics", () => {
    test("extracts metrics from successful Transaction result", () => {
      const result = makeSuccessResult({
        computationCost: "2000000",
        storageCost: "1000000",
        storageRebate: "500000",
        nonRefundableStorageFee: "100000",
      })

      const metrics = extractGasMetrics(result)

      expect(metrics.success).toBe(true)
      expect(metrics.computationCost).toBe("2000000")
      expect(metrics.storageCost).toBe("1000000")
      expect(metrics.storageRebate).toBe("500000")
      expect(metrics.nonRefundableStorageFee).toBe("100000")
      // totalGasCost = 2000000 + 1000000 - 500000 + 100000 = 2600000
      expect(metrics.totalGasCost).toBe("2600000")
      expect(metrics.error).toBeUndefined()
    })

    test("extracts metrics from FailedTransaction result", () => {
      const result = makeFailureResult("MoveAbort in module")

      const metrics = extractGasMetrics(result)

      expect(metrics.success).toBe(false)
      expect(metrics.error).toBe("MoveAbort in module")
      expect(metrics.totalGasCost).toBe("0")
    })

    test("handles result with failure status but no error string", () => {
      const result: SimulateTransactionResult = {
        effects: {
          status: { status: 'failure' },
          gasUsed: {
            computationCost: "0",
            storageCost: "0",
            storageRebate: "0",
            nonRefundableStorageFee: "0",
          },
        },
      }

      const metrics = extractGasMetrics(result)
      expect(metrics.success).toBe(false)
      expect(metrics.error).toBe("Unknown error")
    })
  })

  describe("calculateGasEfficiency", () => {
    test("calculates efficiency correctly", () => {
      const efficiency = calculateGasEfficiency(new BN("1000000"), "1000")
      expect(efficiency).toBe(1000)
    })

    test("returns 0 for zero gas cost", () => {
      const efficiency = calculateGasEfficiency(new BN("1000000"), "0")
      expect(efficiency).toBe(0)
    })

    test("handles large amounts", () => {
      const efficiency = calculateGasEfficiency(new BN("1000000000000"), "1000000")
      expect(efficiency).toBe(1000000)
    })
  })

  describe("calculatePriceImpact", () => {
    test("calculates zero impact when output matches expected", () => {
      const impact = calculatePriceImpact(new BN("1000000"), new BN("1000000"), 1)
      expect(impact).toBe(0)
    })

    test("calculates positive impact when output is less than expected", () => {
      const impact = calculatePriceImpact(new BN("1000000"), new BN("900000"), 1)
      expect(impact).toBe(10) // 10% price impact
    })

    test("returns 0 for zero expected output", () => {
      const impact = calculatePriceImpact(new BN("0"), new BN("0"), 1)
      expect(impact).toBe(0)
    })
  })

  describe("compareGasMetrics", () => {
    test("compares v2 and v3 analyses", () => {
      const v2 = [makeAnalysis({ provider: "V2" })]
      const v3 = [makeAnalysis({ provider: "V3" })]

      const comparison = compareGasMetrics(v2, v3)

      expect(comparison.v2).toHaveLength(1)
      expect(comparison.v3).toHaveLength(1)
      expect(comparison.summary.totalTests).toBe(2)
      expect(comparison.summary.v2SuccessRate).toBe(100)
      expect(comparison.summary.v3SuccessRate).toBe(100)
    })

    test("handles empty analyses", () => {
      const comparison = compareGasMetrics([], [])
      expect(comparison.summary.gasSavingsPercent).toBe(0)
    })

    test("handles mixed success/failure analyses", () => {
      const failedMetrics: GasMetrics = {
        computationCost: "0",
        storageCost: "0",
        storageRebate: "0",
        nonRefundableStorageFee: "0",
        totalGasCost: "0",
        gasUsed: "0",
        gasPrice: "1000",
        success: false,
        error: "Failed",
      }
      const v2 = [
        makeAnalysis(),
        makeAnalysis({ gasMetrics: failedMetrics }),
      ]
      const v3 = [makeAnalysis()]

      const comparison = compareGasMetrics(v2, v3)
      expect(comparison.summary.v2SuccessRate).toBe(50)
      expect(comparison.summary.v3SuccessRate).toBe(100)
    })
  })

  describe("formatGasMetrics", () => {
    test("formats successful metrics", () => {
      const metrics: GasMetrics = {
        computationCost: "1000000",
        storageCost: "500000",
        storageRebate: "200000",
        nonRefundableStorageFee: "50000",
        totalGasCost: "1350000",
        gasUsed: "1000000",
        gasPrice: "1000",
        success: true,
      }

      const formatted = formatGasMetrics(metrics)
      expect(formatted).toContain("1350000")
      expect(formatted).toContain("MIST")
      expect(formatted).toContain("SUI")
    })

    test("formats estimated metrics with flag", () => {
      const metrics: GasMetrics = {
        computationCost: "0",
        storageCost: "0",
        storageRebate: "0",
        nonRefundableStorageFee: "0",
        totalGasCost: "0",
        gasUsed: "0",
        gasPrice: "1000",
        success: true,
      }

      const formatted = formatGasMetrics(metrics, true)
      expect(formatted).toContain("(estimated)")
    })

    test("formats failed metrics", () => {
      const metrics: GasMetrics = {
        computationCost: "0",
        storageCost: "0",
        storageRebate: "0",
        nonRefundableStorageFee: "0",
        totalGasCost: "0",
        gasUsed: "0",
        gasPrice: "0",
        success: false,
        error: "Abort code 42",
      }

      const formatted = formatGasMetrics(metrics)
      expect(formatted).toBe("Failed: Abort code 42")
    })
  })

  describe("exportToJSON", () => {
    test("exports comparison to valid JSON", () => {
      const comparison = compareGasMetrics([makeAnalysis()], [makeAnalysis()])
      const json = exportToJSON(comparison)
      const parsed = JSON.parse(json)
      expect(parsed.summary).toBeDefined()
      expect(parsed.v2).toHaveLength(1)
      expect(parsed.v3).toHaveLength(1)
    })
  })

  describe("exportToCSV", () => {
    test("exports comparison to CSV with headers", () => {
      const comparison = compareGasMetrics([makeAnalysis()], [makeAnalysis()])
      const csv = exportToCSV(comparison)
      const lines = csv.split("\n")
      expect(lines[0]).toContain("Version")
      expect(lines[0]).toContain("Provider")
      expect(lines[1]).toContain("V2")
      expect(lines[2]).toContain("V3")
    })
  })
})
