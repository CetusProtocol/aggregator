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

export type AggregatorErrorCode = TypesErrorCode

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
