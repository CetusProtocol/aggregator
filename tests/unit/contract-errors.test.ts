import { describe, test, expect } from "vitest"
import {
  AGGREGATOR_CONTRACT_ABORT_CODES,
  AggregatorError,
  TransactionErrorCode,
  getAggregatorContractErrorMessage,
  parseAggregatorContractError,
} from "~/errors"
import { throwOnAggregatorContractFailure } from "~/client"

// Real error string from failed mainnet tx
// CWzuWFa4813d3oLhyxXoRtf9qhV9PdFCKFG77YMZHcpG
const SLIPPAGE_ABORT_ERROR =
  'MoveAbort(MoveLocation { module: ModuleId { address: ffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9, name: Identifier("errors") }, function: 0, instruction: 1, function_name: Some("err_amount_out_slippage_check_failed") }, 1) in command 6'

describe("parseAggregatorContractError", () => {
  test("parses the slippage check failure from the sample tx", () => {
    const parsed = parseAggregatorContractError(SLIPPAGE_ABORT_ERROR)
    expect(parsed).not.toBeNull()
    expect(parsed!.code).toBe(1)
    expect(parsed!.errorCode).toBe(
      TransactionErrorCode.AmountOutSlippageCheckFailed
    )
    expect(parsed!.functionName).toBe("err_amount_out_slippage_check_failed")
    expect(parsed!.command).toBe(6)
    expect(parsed!.msg).toContain("Slippage check failed")
  })

  test("parses other abort codes from the errors module", () => {
    const cases: Array<[string, number, TransactionErrorCode]> = [
      ["err_remains_balance", 2, TransactionErrorCode.RemainsBalance],
      ["err_amount_in_is_zero", 3, TransactionErrorCode.AmountInIsZero],
      [
        "err_exceed_max_amount_in",
        7,
        TransactionErrorCode.ExceedMaxAmountIn,
      ],
      ["err_invalid_slippage", 9, TransactionErrorCode.InvalidSlippage],
      [
        "err_expect_amount_out_overflow",
        13,
        TransactionErrorCode.ExpectAmountOutOverflow,
      ],
    ]
    for (const [fn, code, expected] of cases) {
      const err = `MoveAbort(MoveLocation { module: ModuleId { address: ffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9, name: Identifier("errors") }, function: 0, instruction: 1, function_name: Some("${fn}") }, ${code}) in command 2`
      const parsed = parseAggregatorContractError(err)
      expect(parsed).not.toBeNull()
      expect(parsed!.code).toBe(code)
      expect(parsed!.errorCode).toBe(expected)
    }
  })

  test("parses without function_name (older node output)", () => {
    const err =
      'MoveAbort(MoveLocation { module: ModuleId { address: ffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9, name: Identifier("errors") }, function: 0, instruction: 1 }, 1) in command 6'
    const parsed = parseAggregatorContractError(err)
    expect(parsed).not.toBeNull()
    expect(parsed!.errorCode).toBe(
      TransactionErrorCode.AmountOutSlippageCheckFailed
    )
    expect(parsed!.functionName).toBeUndefined()
  })

  test("returns null for aborts in other modules", () => {
    const err =
      'MoveAbort(MoveLocation { module: ModuleId { address: 1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb, name: Identifier("pool") }, function: 12, instruction: 45 }, 4) in command 3'
    expect(parseAggregatorContractError(err)).toBeNull()
  })

  test("returns null for unknown abort codes in the errors module", () => {
    const err =
      'MoveAbort(MoveLocation { module: ModuleId { address: ffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9, name: Identifier("errors") }, function: 0, instruction: 1 }, 999) in command 6'
    expect(parseAggregatorContractError(err)).toBeNull()
  })

  test("returns null for non-abort errors and empty input", () => {
    expect(parseAggregatorContractError("InsufficientGas")).toBeNull()
    expect(parseAggregatorContractError("")).toBeNull()
    expect(parseAggregatorContractError(null)).toBeNull()
    expect(parseAggregatorContractError(undefined)).toBeNull()
  })

  test("every mapped abort code has a message", () => {
    for (const errorCode of Object.values(AGGREGATOR_CONTRACT_ABORT_CODES)) {
      const msg = getAggregatorContractErrorMessage(errorCode)
      expect(msg).toBeTruthy()
      expect(msg).not.toContain("Unknown contract error")
    }
  })

  test("message function appends optional detail like getAggregatorServerErrorMessage", () => {
    const msg = getAggregatorContractErrorMessage(
      TransactionErrorCode.AmountInIsZero,
      "extra detail"
    )
    expect(msg).toBe("Amount in is zero: extra detail")
  })
})

describe("throwOnAggregatorContractFailure", () => {
  test("throws AggregatorError with existing-style errorCode for slippage abort (current effects shape)", () => {
    const result = {
      effects: {
        status: { success: false, error: { message: SLIPPAGE_ABORT_ERROR } },
      },
    }
    try {
      throwOnAggregatorContractFailure(result)
      throw new Error("expected to throw")
    } catch (e) {
      expect(e).toBeInstanceOf(AggregatorError)
      const err = e as AggregatorError
      // Works with the pre-existing static helper
      expect(
        AggregatorError.isAggregatorErrorCode(
          err,
          TransactionErrorCode.AmountOutSlippageCheckFailed
        )
      ).toBe(true)
      expect(err.message).toContain("Slippage check failed")
      expect(err.message).toContain("abort code 1")
      expect(err.message).toContain("command 6")
    }
  })

  test("throws typed AggregatorError for slippage abort (legacy effects shape)", () => {
    const result = {
      effects: {
        status: { status: "failure", error: SLIPPAGE_ABORT_ERROR },
      },
    }
    expect(() => throwOnAggregatorContractFailure(result)).toThrowError(
      AggregatorError
    )
    try {
      throwOnAggregatorContractFailure(result)
    } catch (e) {
      expect((e as AggregatorError).errorCode).toBe(
        TransactionErrorCode.AmountOutSlippageCheckFailed
      )
    }
  })

  test("throws generic TransactionFailed for non-aggregator failures", () => {
    const result = {
      effects: {
        status: { success: false, error: { message: "InsufficientGas" } },
      },
    }
    try {
      throwOnAggregatorContractFailure(result)
      throw new Error("expected to throw")
    } catch (e) {
      expect(e).toBeInstanceOf(AggregatorError)
      expect(
        AggregatorError.isAggregatorErrorCode(
          e,
          TransactionErrorCode.TransactionFailed
        )
      ).toBe(true)
      expect((e as AggregatorError).message).toBe("InsufficientGas")
    }
  })

  test("does not throw on success (current shape)", () => {
    const result = {
      effects: { status: { success: true, error: null } },
    }
    expect(() => throwOnAggregatorContractFailure(result)).not.toThrow()
  })

  test("does not throw on success (legacy shape)", () => {
    const result = {
      effects: { status: { status: "success" } },
    }
    expect(() => throwOnAggregatorContractFailure(result)).not.toThrow()
  })

  test("does not throw when effects are absent", () => {
    expect(() => throwOnAggregatorContractFailure({})).not.toThrow()
    expect(() => throwOnAggregatorContractFailure(null)).not.toThrow()
    expect(() => throwOnAggregatorContractFailure(undefined)).not.toThrow()
  })
})
