import BN from "bn.js"
import Decimal from "decimal.js"
import { completionCoin } from "~/utils/coin"
import { ZERO } from "./const"
import {
  AggregatorServerErrorCode,
  getAggregatorServerErrorMessage,
} from "./errors"
import { parseRouterResponse } from "./client"

export interface FindRouterParams {
  from: string
  target: string
  amount: BN
  byAmountIn: boolean
  depth?: number
  splitAlgorithm?: string
  splitFactor?: number
  splitCount?: number
  providers?: string[]
}

export type ExtendedDetails = {
  aftermathPoolFlatness?: number
  aftermathLpSupplyType?: string
  turbosFeeType?: string
}

export type Path = {
  id: string
  direction: boolean
  provider: string
  from: string
  target: string
  feeRate: number
  amountIn: number
  amountOut: number
  extendedDetails?: ExtendedDetails
  version?: string
}

export type Router = {
  path: Path[]
  amountIn: BN
  amountOut: BN
  initialPrice: Decimal
}

export type RouterError = {
  code: number
  msg: string
}

export type RouterData = {
  amountIn: BN
  amountOut: BN
  routes: Router[]
  insufficientLiquidity: boolean
  error?: RouterError
}

export type AggregatorResponse = {
  code: number
  msg: string
  data: RouterData
}

export async function getRouterResult(
  endpoint: string,
  params: FindRouterParams
): Promise<RouterData | null> {
  const {
    from,
    target,
    amount,
    byAmountIn,
    depth,
    splitAlgorithm,
    splitFactor,
    splitCount,
    providers,
  } = params
  const fromCoin = completionCoin(from)
  const targetCoin = completionCoin(target)

  let url = `${endpoint}?from=${fromCoin}&target=${targetCoin}&amount=${amount.toString()}&by_amount_in=${byAmountIn}`

  if (depth) {
    url += `&depth=${depth}`
  }

  if (splitAlgorithm) {
    url += `&split_algorithm=${splitAlgorithm}`
  }

  if (splitFactor) {
    url += `&split_factor=${splitFactor}`
  }

  if (splitCount) {
    url += `&split_count=${splitCount}`
  }

  if (providers) {
    if (providers.length > 0) {
      url += `&providers=${providers.join(",")}`
    }
  }

  const response = await fetch(url)
  if (!response.ok) {
    return {
      amountIn: ZERO,
      amountOut: ZERO,
      routes: [],
      insufficientLiquidity: false,
      error: {
        code: AggregatorServerErrorCode.NumberTooLarge,
        msg: getAggregatorServerErrorMessage(
          AggregatorServerErrorCode.NumberTooLarge
        ),
      },
    }
  }
  const data = await response.json()
  if (data.data != null) {
    const res = parseRouterResponse(data.data)
    return res
  }
  const insufficientLiquidity = data.msg === "liquidity is not enough"

  return {
    amountIn: ZERO,
    amountOut: ZERO,
    routes: [],
    insufficientLiquidity,
    error: {
      code: AggregatorServerErrorCode.InsufficientLiquidity,
      msg: getAggregatorServerErrorMessage(
        AggregatorServerErrorCode.InsufficientLiquidity
      ),
    },
  }
}
