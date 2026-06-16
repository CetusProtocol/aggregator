import { describe, test, expect } from "vitest"
import { Transaction } from "@mysten/sui/transactions"
import {
  estimateSwapGasBudget,
  hasPythPrelude,
  lookupGasBudget,
  PYTH_PRELUDE_CALLS,
  SWAP_GAS_BUDGET_TABLE,
} from "~/utils/gas-budget"

const SUI = 1_000_000_000

function addMoveCalls(tx: Transaction, count: number, target?: string) {
  for (let i = 0; i < count; i++) {
    tx.moveCall({
      target: target ?? "0x2::coin::zero",
      typeArguments: target ? [] : ["0x2::sui::SUI"],
      arguments: [],
    })
  }
}

describe("lookupGasBudget", () => {
  test("bucket boundaries without Pyth", () => {
    expect(lookupGasBudget(0, false)).toBe(0.05 * SUI)
    expect(lookupGasBudget(10, false)).toBe(0.05 * SUI)
    expect(lookupGasBudget(11, false)).toBe(0.15 * SUI)
    expect(lookupGasBudget(19, false)).toBe(0.15 * SUI)
    expect(lookupGasBudget(20, false)).toBe(0.25 * SUI)
    expect(lookupGasBudget(29, false)).toBe(0.25 * SUI)
    expect(lookupGasBudget(30, false)).toBe(0.35 * SUI)
    expect(lookupGasBudget(39, false)).toBe(0.35 * SUI)
    expect(lookupGasBudget(40, false)).toBe(0.5 * SUI)
    expect(lookupGasBudget(100, false)).toBe(0.5 * SUI)
  })

  test("bucket boundaries with Pyth", () => {
    expect(lookupGasBudget(0, true)).toBe(0.05 * SUI)
    expect(lookupGasBudget(10, true)).toBe(0.05 * SUI)
    expect(lookupGasBudget(11, true)).toBe(0.1 * SUI)
    expect(lookupGasBudget(19, true)).toBe(0.1 * SUI)
    expect(lookupGasBudget(20, true)).toBe(0.2 * SUI)
    expect(lookupGasBudget(29, true)).toBe(0.2 * SUI)
    expect(lookupGasBudget(30, true)).toBe(0.3 * SUI)
    expect(lookupGasBudget(39, true)).toBe(0.3 * SUI)
    expect(lookupGasBudget(40, true)).toBe(0.5 * SUI)
    expect(lookupGasBudget(100, true)).toBe(0.5 * SUI)
  })

  test("every table entry has positive integer MIST budgets", () => {
    for (const row of SWAP_GAS_BUDGET_TABLE) {
      expect(Number.isInteger(row.noPyth)).toBe(true)
      expect(Number.isInteger(row.pyth)).toBe(true)
      expect(row.noPyth).toBeGreaterThan(0)
      expect(row.pyth).toBeGreaterThan(0)
    }
  })
})

describe("hasPythPrelude", () => {
  test.each([...PYTH_PRELUDE_CALLS])(
    "detects %s regardless of package id",
    (call) => {
      const tx = new Transaction()
      addMoveCalls(tx, 1)
      addMoveCalls(tx, 1, `0xabc123::${call}`)
      expect(hasPythPrelude(tx)).toBe(true)
    }
  )

  test("ignores same function name in a different module", () => {
    const tx = new Transaction()
    addMoveCalls(tx, 1, "0xabc123::foo::destroy")
    addMoveCalls(tx, 1, "0xabc123::router::parse_and_verify")
    expect(hasPythPrelude(tx)).toBe(false)
  })

  test("returns false for a transaction without Pyth calls", () => {
    const tx = new Transaction()
    addMoveCalls(tx, 3)
    tx.splitCoins(tx.gas, [100])
    expect(hasPythPrelude(tx)).toBe(false)
  })
})

describe("estimateSwapGasBudget", () => {
  test("counts non-MoveCall commands toward the bucket", () => {
    const tx = new Transaction()
    addMoveCalls(tx, 8)
    tx.splitCoins(tx.gas, [100]) // 9th command
    expect(estimateSwapGasBudget(tx)).toBe(0.05 * SUI)
    tx.splitCoins(tx.gas, [100]) // 10th
    expect(estimateSwapGasBudget(tx)).toBe(0.05 * SUI)
    tx.splitCoins(tx.gas, [100]) // 11th -> next bucket
    expect(estimateSwapGasBudget(tx)).toBe(0.15 * SUI)
  })

  test("uses the Pyth column when a prelude call is present", () => {
    const tx = new Transaction()
    addMoveCalls(tx, 14)
    addMoveCalls(tx, 1, "0xabc123::pyth::update_single_price_feed")
    expect(estimateSwapGasBudget(tx)).toBe(0.1 * SUI)
  })

  test("result is accepted by tx.setGasBudget", () => {
    const tx = new Transaction()
    addMoveCalls(tx, 5)
    tx.setGasBudget(estimateSwapGasBudget(tx))
    expect(tx.getData().gasData.budget).toBe("50000000")
  })
})
