// Copyright 2025 0xBondSui <sugar@cetus.zone>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DevInspectResults } from "@mysten/sui/client"
import BN from "bn.js"

export interface GasMetrics {
  computationCost: string
  storageCost: string
  storageRebate: string
  nonRefundableStorageFee: string
  totalGasCost: string
  gasUsed: string
  gasPrice: string
  success: boolean
  error?: string
}

export interface SwapGasAnalysis {
  gasMetrics: GasMetrics
  amountIn: BN
  amountOut: BN
  priceImpact: number
  gasEfficiency: number // amount out per gas unit
  provider: string
  route: string[]
  timestamp: number
  isEstimated?: boolean // Mark if gas data is estimated vs simulated
  originalPathCount?: number // Number of individual paths before merging
  mergedPathCount?: number // Number of paths after aggregator optimization
}

export interface ComparisonResult {
  v2: SwapGasAnalysis[]
  v3: SwapGasAnalysis[]
  summary: {
    v2AverageGas: string
    v3AverageGas: string
    gasSavingsPercent: number
    v2SuccessRate: number
    v3SuccessRate: number
    totalTests: number
  }
}

/**
 * Extract gas metrics from DevInspectResults
 */
export function extractGasMetrics(result: DevInspectResults): GasMetrics {
  const effects = result.effects
  const success = effects.status.status === "success"

  if (!success) {
    return {
      computationCost: "0",
      storageCost: "0",
      storageRebate: "0",
      nonRefundableStorageFee: "0",
      totalGasCost: "0",
      gasUsed: "0",
      gasPrice: "0",
      success: false,
      error: effects.status.error || "Unknown error",
    }
  }

  const gasUsed = effects.gasUsed
  return {
    computationCost: gasUsed.computationCost || "0",
    storageCost: gasUsed.storageCost || "0",
    storageRebate: gasUsed.storageRebate || "0",
    nonRefundableStorageFee: gasUsed.nonRefundableStorageFee || "0",
    totalGasCost: calculateTotalGasCost(gasUsed),
    gasUsed: gasUsed.computationCost || "0",
    gasPrice: "1000", // Standard Sui gas price in MIST
    success: true,
  }
}

/**
 * Calculate total gas cost from gas used components
 */
function calculateTotalGasCost(gasUsed: any): string {
  const computation = new BN(gasUsed.computationCost || "0")
  const storage = new BN(gasUsed.storageCost || "0")
  const rebate = new BN(gasUsed.storageRebate || "0")
  const nonRefundable = new BN(gasUsed.nonRefundableStorageFee || "0")

  return computation.add(storage).sub(rebate).add(nonRefundable).toString()
}

/**
 * Calculate gas efficiency (amount out per gas unit)
 */
export function calculateGasEfficiency(
  amountOut: BN,
  totalGasCost: string
): number {
  const gasCost = new BN(totalGasCost)
  if (gasCost.isZero()) return 0

  return amountOut.div(gasCost).toNumber()
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  amountIn: BN,
  amountOut: BN,
  expectedRate: number = 1
): number {
  const expectedOut = amountIn
    .mul(new BN(Math.floor(expectedRate * 1000000)))
    .div(new BN(1000000))
  if (expectedOut.isZero()) return 0

  const impact = expectedOut.sub(amountOut).mul(new BN(10000)).div(expectedOut)
  return impact.toNumber() / 100 // Convert to percentage
}

/**
 * Compare gas metrics between two analyses
 */
export function compareGasMetrics(
  v2Analysis: SwapGasAnalysis[],
  v3Analysis: SwapGasAnalysis[]
): ComparisonResult {
  const v2SuccessfulTests = v2Analysis.filter(a => a.gasMetrics.success)
  const v3SuccessfulTests = v3Analysis.filter(a => a.gasMetrics.success)

  const v2AverageGas = calculateAverageGas(v2SuccessfulTests)
  const v3AverageGas = calculateAverageGas(v3SuccessfulTests)

  const gasSavingsPercent = v2AverageGas.isZero()
    ? 0
    : v2AverageGas
        .sub(v3AverageGas)
        .mul(new BN(10000))
        .div(v2AverageGas)
        .toNumber() / 100

  return {
    v2: v2Analysis,
    v3: v3Analysis,
    summary: {
      v2AverageGas: v2AverageGas.toString(),
      v3AverageGas: v3AverageGas.toString(),
      gasSavingsPercent,
      v2SuccessRate: (v2SuccessfulTests.length / v2Analysis.length) * 100,
      v3SuccessRate: (v3SuccessfulTests.length / v3Analysis.length) * 100,
      totalTests: v2Analysis.length + v3Analysis.length,
    },
  }
}

/**
 * Calculate average gas cost from successful analyses
 */
function calculateAverageGas(analyses: SwapGasAnalysis[]): BN {
  if (analyses.length === 0) return new BN(0)

  const totalGas = analyses.reduce((sum, analysis) => {
    return sum.add(new BN(analysis.gasMetrics.totalGasCost))
  }, new BN(0))

  return totalGas.div(new BN(analyses.length))
}

/**
 * Format gas metrics for human readable output
 */
export function formatGasMetrics(
  metrics: GasMetrics,
  isEstimated?: boolean
): string {
  if (!metrics.success) {
    return `❌ Failed: ${metrics.error}`
  }

  const totalGas = Number(metrics.totalGasCost)
  const gasInSui = totalGas / 1000000000 // Convert MIST to SUI
  const estimatedFlag = isEstimated ? " (estimated)" : ""

  return `✅ Gas: ${totalGas.toString()} MIST (${gasInSui.toString()} SUI)${estimatedFlag}`
}

/**
 * Export results to JSON format
 */
export function exportToJSON(comparison: ComparisonResult): string {
  return JSON.stringify(comparison, null, 2)
}

/**
 * Export results to CSV format
 */
export function exportToCSV(comparison: ComparisonResult): string {
  const headers = [
    "Version",
    "Provider",
    "Success",
    "AmountIn",
    "AmountOut",
    "TotalGasCost",
    "ComputationCost",
    "GasEfficiency",
    "PriceImpact",
    "OriginalPaths",
    "MergedPaths",
    "PathReduction%",
    "Timestamp",
  ]

  const rows = [headers.join(",")]

  // Add V2 results
  comparison.v2.forEach(analysis => {
    const pathReduction = analysis.originalPathCount && analysis.mergedPathCount
      ? ((analysis.originalPathCount - analysis.mergedPathCount) / analysis.originalPathCount * 100).toFixed(1)
      : "0"
    
    rows.push(
      [
        "V2",
        analysis.provider,
        analysis.gasMetrics.success,
        analysis.amountIn.toString(),
        analysis.amountOut.toString(),
        analysis.gasMetrics.totalGasCost,
        analysis.gasMetrics.computationCost,
        analysis.gasEfficiency.toString(),
        analysis.priceImpact.toString(),
        analysis.originalPathCount || 0,
        analysis.mergedPathCount || 0,
        pathReduction,
        analysis.timestamp.toString(),
      ].join(",")
    )
  })

  // Add V3 results
  comparison.v3.forEach(analysis => {
    const pathReduction = analysis.originalPathCount && analysis.mergedPathCount
      ? ((analysis.originalPathCount - analysis.mergedPathCount) / analysis.originalPathCount * 100).toFixed(1)
      : "0"
    
    rows.push(
      [
        "V3",
        analysis.provider,
        analysis.gasMetrics.success,
        analysis.amountIn.toString(),
        analysis.amountOut.toString(),
        analysis.gasMetrics.totalGasCost,
        analysis.gasMetrics.computationCost,
        analysis.gasEfficiency.toString(),
        analysis.priceImpact.toString(),
        analysis.originalPathCount || 0,
        analysis.mergedPathCount || 0,
        pathReduction,
        analysis.timestamp.toString(),
      ].join(",")
    )
  })

  return rows.join("\n")
}
