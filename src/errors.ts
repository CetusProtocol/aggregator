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
}

export enum AggregatorServerErrorCode {
  NumberTooLarge = 1000,
  RateLimitExceeded = 1001,
  InsufficientLiquidity = 1002,
  HoneyPot = 1003,
}

export type AggregatorErrorCode = TypesErrorCode

export function getAggregatorServerErrorMessage(
  code: AggregatorServerErrorCode
): string {
  switch (code) {
    case AggregatorServerErrorCode.NumberTooLarge:
      return "Number too large"
    case AggregatorServerErrorCode.RateLimitExceeded:
      return "Rate limit exceeded"
    case AggregatorServerErrorCode.InsufficientLiquidity:
      return "Insufficient liquidity"
    case AggregatorServerErrorCode.HoneyPot:
      return "HoneyPot scam detected"
    default:
      return "Unknown error"
  }
}

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
