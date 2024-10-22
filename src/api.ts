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
  liquidityChanges?: PreSwapLpChangeParams[]
}

export interface PreSwapLpChangeParams {
  poolID: string
  ticklower: number
  tickUpper: number
  deltaLiquidity: number
}

export type ExtendedDetails = {
  aftermathPoolFlatness?: number
  aftermathLpSupplyType?: string
  turbosFeeType?: string
  afterSqrtPrice?: string
  deepbookv3DeepFee?: number
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
  totalDeepFee?: number
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
  let response
  if (params.liquidityChanges && params.liquidityChanges.length > 0) {
    response = await postRouterWithLiquidityChanges(endpoint, params)
  } else {
    response = await getRouter(endpoint, params)
  }

  if (!response) {
    return null
  }

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

async function getRouter(endpoint: string, params: FindRouterParams) {
  try {
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

    let url = `${endpoint}/find_routes?from=${fromCoin}&target=${targetCoin}&amount=${amount.toString()}&by_amount_in=${byAmountIn}`

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

    // set newest sdk version
    url += "&v=1000302"

    const response = await fetch(url)
    return response
  } catch (error) {
    console.error(error)
    return null
  }
}

async function postRouterWithLiquidityChanges(
  endpoint: string,
  params: FindRouterParams
) {
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
    liquidityChanges,
  } = params

  const fromCoin = completionCoin(from)
  const targetCoin = completionCoin(target)
  const url = `${endpoint}/find_routes`
  const providersStr = providers?.join(",")
  const requestData = {
    from: fromCoin,
    target: targetCoin,
    amount: Number(amount.toString()),
    by_amount_in: byAmountIn,
    depth,
    split_algorithm: splitAlgorithm,
    split_factor: splitFactor,
    split_count: splitCount,
    providers: providersStr,
    liquidity_changes: liquidityChanges!.map((change) => ({
      pool: change.poolID,
      tick_lower: change.ticklower,
      tick_upper: change.tickUpper,
      delta_liquidity: change.deltaLiquidity,
    })),
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })

    return response
  } catch (error) {
    console.error("Error:", error)
    return null
  }
}

export type DeepbookV3Config = {
  id: string
  is_alternative_payment: boolean
  alternative_payment_amount: number
  trade_cap: string
  balance_manager: string 
  deep_fee_vault: number
  whitelist: number
  package_version: 0
  // unix timestamp in seconds
  last_updated_time: number
  whitelist_pools: string[]
}

export type DeepbookV3ConfigResponse = {
  code: number
  msg: string
  data: DeepbookV3Config
}

export async function getDeepbookV3Config(
  endpoint: string
): Promise<DeepbookV3ConfigResponse | null> {
  const url = `${endpoint}/deepbookv3_config`
  try {
    const response = await fetch(url)
    return response.json() as Promise<DeepbookV3ConfigResponse>
  } catch (error) {
    console.error("Error:", error)
    return null
  }
}
