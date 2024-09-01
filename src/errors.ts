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

  errorCode?: AggregatorErrorCode

  constructor(message: string, errorCode?: AggregatorErrorCode) {
    super(message)
    this.message = message
    this.errorCode = errorCode
  }

  static isAggregatorErrorCode(e: any, code: AggregatorErrorCode): boolean {
    return e instanceof AggregatorError && e.errorCode === code
  }
}

export enum AggregatorServerErrorCode {
  CalculateError = 10000,
  NumberTooLarge = 10001,
  NoRouter = 10002,
  InsufficientLiquidity = 10003,
}

export function getAggregatorServerErrorMessage(
  code: AggregatorServerErrorCode
): string {
  switch (code) {
    case AggregatorServerErrorCode.CalculateError:
      return "Calculate error"
    case AggregatorServerErrorCode.NumberTooLarge:
      return "Input number too large can not fit in target type"
    case AggregatorServerErrorCode.NoRouter:
      return "No router"
    case AggregatorServerErrorCode.InsufficientLiquidity:
      return "Insufficient Liquidity"
    default:
      return "Unknown error"
  }
}
