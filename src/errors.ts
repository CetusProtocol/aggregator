export enum TypesErrorCode {
  InvalidType = `InvalidType`,
}

export enum ConfigErrorCode {
  MissAggregatorPackage = `MissAggregatorPackage`,
  MissGlobalConfig = `MissGlobalConfig`,
  InvalidWallet = `InvalidWallet`,
  SimulateError = `SimulateError`,
}

export enum TransactionErrorCode {
  InsufficientBalance = `InsufficientBalance`,
  SimulateEventError = `simulateEventError`,
  CannotGetDecimals = `CannotGetDecimals`,
  MissCoinA = `MissCoinA`,
  MissCoinB = `MissCoinB`,
  MissTurbosFeeType = `MissTurbosFeeType`,
  MissAftermathLpSupplyType = `MissAftermathLpSupplyType`,
  // On-chain abort errors of the aggregator v3 contract's `errors` module
  // (mainnet 0xffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9).
  // See AGGREGATOR_CONTRACT_ABORT_CODES for the numeric abort-code mapping.
  AmountOutSlippageCheckFailed = `AmountOutSlippageCheckFailed`,
  RemainsBalance = `RemainsBalance`,
  AmountInIsZero = `AmountInIsZero`,
  InvalidFeeRecipient = `InvalidFeeRecipient`,
  TooLargeFeeRate = `TooLargeFeeRate`,
  NotSupportB2a = `NotSupportB2a`,
  ExceedMaxAmountIn = `ExceedMaxAmountIn`,
  AmountOutIsZero = `AmountOutIsZero`,
  InvalidSlippage = `InvalidSlippage`,
  AmountOutLimitIsZero = `AmountOutLimitIsZero`,
  MissingQuoteGuard = `MissingQuoteGuard`,
  ExpectAmountOutOverflow = `ExpectAmountOutOverflow`,
  TransactionFailed = `TransactionFailed`,
}

export type AggregatorErrorCode =
  | TypesErrorCode
  | ConfigErrorCode
  | TransactionErrorCode

/**
 * AggregatorError is a custom error class that extends the built-in Error class. It is used to represent errors that occur during aggregation operations.
 * The key functionality of this code includes:
 * - Defining the AggregatorError class that represents an error during aggregation. It includes a message property and an optional errorCode property.
 * - Providing a static method isAggregatorErrorCode() that checks if a given error instance is an instance of AggregatorError and has a specific error code.
 */
export class AggregatorError extends Error {
  override message: string

  errorCode?: AggregatorErrorCode | string

  constructor(message: string, errorCode?: AggregatorErrorCode | string) {
    super(message)
    this.message = message
    this.errorCode = errorCode
  }

  static isAggregatorErrorCode(e: any, code: AggregatorErrorCode): boolean {
    return e instanceof AggregatorError && e.errorCode === code
  }
}

/**
 * Maps the numeric abort codes of the aggregator v3 contract's `errors`
 * module (mainnet 0xffd4058af7d6f6d66c335930cced8c91e38ec943e2392232aee27e8127e684e9)
 * to the existing TransactionErrorCode values. A slippage failure aborts
 * with code 1 (err_amount_out_slippage_check_failed).
 */
export const AGGREGATOR_CONTRACT_ABORT_CODES: Record<
  number,
  TransactionErrorCode
> = {
  1: TransactionErrorCode.AmountOutSlippageCheckFailed,
  2: TransactionErrorCode.RemainsBalance,
  3: TransactionErrorCode.AmountInIsZero,
  4: TransactionErrorCode.InvalidFeeRecipient,
  5: TransactionErrorCode.TooLargeFeeRate,
  6: TransactionErrorCode.NotSupportB2a,
  7: TransactionErrorCode.ExceedMaxAmountIn,
  8: TransactionErrorCode.AmountOutIsZero,
  9: TransactionErrorCode.InvalidSlippage,
  11: TransactionErrorCode.AmountOutLimitIsZero,
  12: TransactionErrorCode.MissingQuoteGuard,
  13: TransactionErrorCode.ExpectAmountOutOverflow,
}

export function getAggregatorContractErrorMessage(
  code: TransactionErrorCode,
  msg?: string
): string {
  const suffix = msg ? `: ${msg}` : ""
  switch (code) {
    case TransactionErrorCode.AmountOutSlippageCheckFailed:
      return (
        "Slippage check failed: the actual amount out is below the allowed minimum. Try increasing slippage or re-fetching the route" +
        suffix
      )
    case TransactionErrorCode.RemainsBalance:
      return "Swap context still holds a remaining balance" + suffix
    case TransactionErrorCode.AmountInIsZero:
      return "Amount in is zero" + suffix
    case TransactionErrorCode.InvalidFeeRecipient:
      return "Invalid fee recipient" + suffix
    case TransactionErrorCode.TooLargeFeeRate:
      return "Fee rate is too large" + suffix
    case TransactionErrorCode.NotSupportB2a:
      return "The pool does not support b2a swap direction" + suffix
    case TransactionErrorCode.ExceedMaxAmountIn:
      return "Amount in exceeds the max amount in limit" + suffix
    case TransactionErrorCode.AmountOutIsZero:
      return "Amount out is zero" + suffix
    case TransactionErrorCode.InvalidSlippage:
      return "Invalid slippage value passed to the contract" + suffix
    case TransactionErrorCode.AmountOutLimitIsZero:
      return "Amount out limit is zero" + suffix
    case TransactionErrorCode.MissingQuoteGuard:
      return "Missing quote guard" + suffix
    case TransactionErrorCode.ExpectAmountOutOverflow:
      return "Expected amount out overflow" + suffix
    default:
      return "Unknown contract error" + suffix
  }
}

export type ParsedAggregatorContractError = {
  /** Numeric abort code from the contract's `errors` module */
  code: number
  /** SDK error code usable with AggregatorError.isAggregatorErrorCode() */
  errorCode: TransactionErrorCode
  /** Human-readable description */
  msg: string
  /** Move function name if present in the error, e.g. "err_amount_out_slippage_check_failed" */
  functionName?: string
  /** Index of the failed PTB command if present */
  command?: number
}

// Matches the MoveAbort error string produced by Sui for aggregator contract
// aborts, e.g.:
//   MoveAbort(MoveLocation { module: ModuleId { address: ffd4..., name: Identifier("errors") },
//     function: 0, instruction: 1, function_name: Some("err_amount_out_slippage_check_failed") }, 1) in command 6
const MOVE_ABORT_ERRORS_MODULE_REGEX =
  /MoveAbort\(.*?name:\s*Identifier\("errors"\).*?\},\s*(\d+)\)(?:\s*in command\s*(\d+))?/s

const MOVE_ABORT_FUNCTION_NAME_REGEX =
  /function_name:\s*Some\("(err_[a-z0-9_]+)"\)/

/**
 * Parses an on-chain failure string (effects.status.error) into a typed
 * aggregator contract error. Returns null when the failure did not originate
 * from the aggregator contract's `errors` module.
 */
export function parseAggregatorContractError(
  error: string | null | undefined
): ParsedAggregatorContractError | null {
  if (!error) {
    return null
  }
  const match = MOVE_ABORT_ERRORS_MODULE_REGEX.exec(error)
  if (!match) {
    return null
  }
  const [, codeStr, commandStr] = match
  const functionName = MOVE_ABORT_FUNCTION_NAME_REGEX.exec(error)?.[1]
  const code = Number(codeStr)
  const errorCode = AGGREGATOR_CONTRACT_ABORT_CODES[code]
  if (!errorCode) {
    return null
  }
  return {
    code,
    errorCode,
    msg: getAggregatorContractErrorMessage(errorCode),
    functionName: functionName || undefined,
    command: commandStr !== undefined ? Number(commandStr) : undefined,
  }
}

export enum AggregatorServerErrorCode {
  NumberTooLarge = 1000,
  RateLimitExceeded = 1001,
  InsufficientLiquidity = 1002,
  HoneyPot = 1003,
  BadRequest = 1004,
  Forbidden = 1005,
  InternalServerError = 1006,
  NotFoundRoute = 1007,
  ServiceUnavailable = 1008,
  UnsupportedApiVersion = 1009,
  HoneyPotScam = 1010,
  UnknownError = 400,
}

export function getAggregatorServerErrorMessage(
  code: AggregatorServerErrorCode,
  msg?: string
): string {
  switch (code) {
    case AggregatorServerErrorCode.NumberTooLarge:
      return "Number too large" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.RateLimitExceeded:
      return "Rate limit exceeded" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.InsufficientLiquidity:
      return "Insufficient liquidity" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.HoneyPot:
      return "HoneyPot scam detected" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.Forbidden:
      return "Forbidden" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.BadRequest:
      return "Bad request" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.InternalServerError:
      return "Internal server error" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.NotFoundRoute:
      return "Not found route" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.ServiceUnavailable:
      return "Service unavailable" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.UnsupportedApiVersion:
      return "Unsupported API version" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.HoneyPotScam:
      return "Detected HoneyPot Scam" + (msg ? `: ${msg}` : "")
    case AggregatorServerErrorCode.UnknownError:
      return "Unknown error" + (msg ? `: ${msg}` : "")
    default:
      return "Unknown error"
  }
}
