import BN from "bn.js"
import JSONbig from "json-bigint"
import { completionCoin } from "./utils/coin"
import { ZERO } from "./const"
import {
  AggregatorServerErrorCode,
  getAggregatorServerErrorMessage,
} from "./errors"

// Remove import of parseRouterResponse from client.ts
import {
  FindRouterParams,
  FlattenedPath,
  ProcessedRouterData,
  DeepbookV3ConfigResponse,
  RouterDataV3,
  MergeSwapParams,
  MergeSwapRouterData,
  MergeRoute,
} from "./types/shared"

const SDK_VERSION = 1010405

function parseRouterResponse(data: any, byAmountIn: boolean): RouterDataV3 {
  // Parse packages map from API response
  let packages = new Map<string, string>()
  if (data.packages) {
    if (data.packages instanceof Map) {
      packages = data.packages
    } else if (typeof data.packages === "object") {
      // Convert object to Map
      Object.entries(data.packages).forEach(([key, value]) => {
        packages.set(key, value as string)
      })
    }
  }

  return {
    quoteID: data.request_id || "",
    amountIn: new BN(data.amount_in.toString()),
    amountOut: new BN(data.amount_out.toString()),
    byAmountIn,
    insufficientLiquidity: false,
    deviationRatio: data.deviation_ratio,
    packages,
    paths: data.paths.map((path: any) => ({
      id: path.id,
      direction: path.direction,
      provider: path.provider,
      from: path.from,
      target: path.target,
      feeRate: path.fee_rate,
      amountIn: path.amount_in.toString(),
      amountOut: path.amount_out.toString(),
      version: path.version,
      publishedAt: path.published_at,
      extendedDetails: path.extended_details,
    })),
  }
}

function parseMergeSwapResponse(data: any): MergeSwapRouterData {
  // Parse packages map from API response
  let packages = new Map<string, string>()
  if (data.packages) {
    if (data.packages instanceof Map) {
      packages = data.packages
    } else if (typeof data.packages === "object") {
      // Convert object to Map
      Object.entries(data.packages).forEach(([key, value]) => {
        packages.set(key, value as string)
      })
    }
  }

  const allRoutes: MergeRoute[] = []

  if (data.all_routes) {
    for (const route of data.all_routes) {
      const mergeRoute: MergeRoute = {
        amountIn: new BN(route.amount_in.toString()),
        amountOut: new BN(route.amount_out.toString()),
        deviationRatio: route.deviation_ratio,
        paths: route.paths.map((path: any) => ({
          id: path.id,
          direction: path.direction,
          provider: path.provider,
          from: path.from,
          target: path.target,
          feeRate: path.fee_rate,
          amountIn: path.amount_in.toString(),
          amountOut: path.amount_out.toString(),
          version: path.version,
          publishedAt: path.published_at,
          extendedDetails: path.extended_details,
        })),
      }
      allRoutes.push(mergeRoute)
    }
  }

  return {
    quoteID: data.request_id || "",
    totalAmountOut: new BN(data.total_amount_out?.toString() || "0"),
    allRoutes,
    packages,
    gas: data.gas,
  }
}

// Re-export shared types for backwards compatibility
export type {
  FindRouterParams,
  PreSwapLpChangeParams,
  ExtendedDetails,
  Path,
  Router,
  RouterError,
  RouterData,
  FlattenedPath,
  ProcessedRouterData,
  AggregatorResponse,
  DeepbookV3Config,
  DeepbookV3ConfigResponse,
  MergeRoute,
  MergeSwapRouterData,
} from "./types/shared"

export async function getRouterResult(
  endpoint: string,
  apiKey: string,
  params: FindRouterParams,
  overlayFee: number,
  overlayFeeReceiver: string
): Promise<RouterDataV3 | null> {
  let response
  if (params.liquidityChanges && params.liquidityChanges.length > 0) {
    response = await postRouterWithLiquidityChanges(endpoint, params)
  } else {
    response = await getRouter(endpoint, apiKey, params)
  }

  if (!response) {
    return null
  }

  if (!response.ok) {
    let errorCode = AggregatorServerErrorCode.BadRequest
    if (response.status === 429) {
      errorCode = AggregatorServerErrorCode.RateLimitExceeded
    }

    return {
      quoteID: "",
      amountIn: ZERO,
      amountOut: ZERO,
      paths: [],
      byAmountIn: params.byAmountIn,
      insufficientLiquidity: false,
      deviationRatio: 0,
      error: {
        code: errorCode,
        msg: getAggregatorServerErrorMessage(errorCode),
      },
    }
  }

  const data = JSONbig.parse(await response.text())

  if (data.data != null) {
    const res = parseRouterResponse(data.data, params.byAmountIn)
    if (overlayFee > 0 && overlayFeeReceiver !== "0x0") {
      if (params.byAmountIn) {
        const overlayFeeAmount = res.amountOut
          .mul(new BN(overlayFee))
          .div(new BN(1000000))
        res.overlayFee = Number(overlayFeeAmount.toString())
        res.amountOut = res.amountOut.sub(overlayFeeAmount)
      } else {
        const overlayFeeAmount = res.amountIn
          .mul(new BN(overlayFee))
          .div(new BN(1000000))
        res.overlayFee = Number(overlayFeeAmount.toString())
        res.amountIn = res.amountIn.add(overlayFeeAmount)
      }
    }

    // Ensure packages map is initialized for V3 compatibility and add default aggregator_v3 package
    if (!res.packages) {
      res.packages = new Map<string, string>()
    }

    // Add default aggregator_v3 package if missing
    if (!res.packages.has("aggregator_v3")) {
      res.packages.set(
        "aggregator_v3",
        "0x3864c7c59a4889fec05d1aae4bc9dba5a0e0940594b424fbed44cb3f6ac4c032"
      )
    }

    return res
  }

  const code = processErrorStatusCode(data.code)
  const msg = getAggregatorServerErrorMessage(code, data.msg)
  const insufficientLiquidity = msg.includes("Insufficient liquidity")

  return {
    quoteID: "",
    amountIn: ZERO,
    amountOut: ZERO,
    paths: [],
    insufficientLiquidity,
    byAmountIn: params.byAmountIn,
    deviationRatio: 0,
    error: {
      code,
      msg,
    },
  }
}

async function getRouter(
  endpoint: string,
  apiKey: string,
  params: FindRouterParams
) {
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

    if (apiKey.length > 0) {
      url += `&apiKey=${apiKey}`
    }

    // set newest sdk version
    url += `&v=${SDK_VERSION}`

    // console.log("url", url)

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
    liquidity_changes: liquidityChanges!.map(change => ({
      pool: change.poolID,
      tick_lower: change.ticklower,
      tick_upper: change.tickUpper,
      delta_liquidity: change.deltaLiquidity,
    })),
    v: SDK_VERSION,
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

async function getMergeSwapRouter(
  endpoint: string,
  apiKey: string,
  params: MergeSwapParams
) {
  try {
    const { target, byAmountIn, depth, providers, froms } = params
    const targetCoin = completionCoin(target)

    let url = `${endpoint}/multi_find_routes?target=${targetCoin}&by_amount_in=${byAmountIn}`

    if (depth) {
      url += `&depth=${depth}`
    }

    if (providers && providers.length > 0) {
      url += `&providers=${providers.join(",")}`
    }

    if (apiKey.length > 0) {
      url += `&apiKey=${apiKey}`
    }

    url += `&v=${SDK_VERSION}`

    // Convert amounts to numbers for API compatibility
    const fromsData = froms.map(from => ({
      coin_type: completionCoin(from.coinType),
      amount: Number(from.amount.toString()),
    }))
    url += `&froms=${encodeURIComponent(JSON.stringify(fromsData))}`

    const response = await fetch(url)
    console.log("response", response)
    return response
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getMergeSwapResult(
  endpoint: string,
  apiKey: string,
  params: MergeSwapParams,
  overlayFee: number,
  overlayFeeReceiver: string
): Promise<MergeSwapRouterData | null> {
  const response = await getMergeSwapRouter(endpoint, apiKey, params)

  if (!response) {
    return null
  }

  if (!response.ok) {
    let errorCode = AggregatorServerErrorCode.BadRequest
    if (response.status === 429) {
      errorCode = AggregatorServerErrorCode.RateLimitExceeded
    }

    return {
      quoteID: "",
      totalAmountOut: ZERO,
      allRoutes: [],
      error: {
        code: errorCode,
        msg: getAggregatorServerErrorMessage(errorCode),
      },
    }
  }

  if (!response.ok) {
    const code = processErrorStatusCode(response.status)
    const responseText = await response.text()
    const data = JSONbig.parse(responseText)
    const msg = getAggregatorServerErrorMessage(code, data.msg)

    return {
      quoteID: "",
      totalAmountOut: ZERO,
      allRoutes: [],
      error: {
        code,
        msg,
      },
    }
  }

  const responseText = await response.text()
  const data = JSONbig.parse(responseText)

  if (data.data != null) {
    console.log("data.data not null", data.data)
    const res = parseMergeSwapResponse(data.data)

    // Apply overlay fee if configured
    if (overlayFee > 0 && overlayFeeReceiver !== "0x0" && params.byAmountIn) {
      // For merge swap, apply overlay fee to total amount out
      const overlayFeeAmount = res.totalAmountOut
        .mul(new BN(overlayFee))
        .div(new BN(1000000))
      res.totalAmountOut = res.totalAmountOut.sub(overlayFeeAmount)

      // Also apply to each route proportionally
      for (const route of res.allRoutes) {
        const routeFee = route.amountOut
          .mul(new BN(overlayFee))
          .div(new BN(1000000))
        route.amountOut = route.amountOut.sub(routeFee)
      }
    }

    if (!res.packages) {
      res.packages = new Map<string, string>()
    }

    return res
  }

  const code = processErrorStatusCode(data.code)
  const msg = getAggregatorServerErrorMessage(code, data.msg)

  return {
    quoteID: "",
    totalAmountOut: ZERO,
    allRoutes: [],
    error: {
      code,
      msg,
    },
  }
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

export function processFlattenRoutes(
  routerData: RouterDataV3
): ProcessedRouterData {
  const paths = routerData.paths
  const fromCoinType = paths[0].from
  const targetCoinType = paths[paths.length - 1].target

  const flattenedPaths: FlattenedPath[] = []

  // Build dependency relationships based on route sequences
  for (const path of paths) {
    flattenedPaths.push({
      path,
      isLastUseOfIntermediateToken: false,
    })
  }

  // Second pass: reverse traverse to mark the last usage of each intermediate token
  const seenTokens = new Map<string, boolean>()
  for (let i = flattenedPaths.length - 1; i >= 0; i--) {
    const { from } = flattenedPaths[i].path
    // Only track intermediate tokens (not the original input token)
    // and only mark if it's the first time we see this token in reverse order
    if (!seenTokens.has(from)) {
      seenTokens.set(from, true)
      flattenedPaths[i].isLastUseOfIntermediateToken = true
    }
  }

  return {
    quoteID: routerData.quoteID || "",
    amountIn: routerData.amountIn,
    amountOut: routerData.amountOut,
    byAmountIn: routerData.byAmountIn,
    flattenedPaths,
    fromCoinType,
    targetCoinType,
    packages: routerData.packages,
    totalDeepFee: routerData.totalDeepFee,
    error: routerData.error,
    overlayFee: routerData.overlayFee,
  }
}

function processErrorStatusCode(status: number): AggregatorServerErrorCode {
  switch (status) {
    case 400:
      return AggregatorServerErrorCode.BadRequest
    case 403:
      return AggregatorServerErrorCode.Forbidden
    case 429:
      return AggregatorServerErrorCode.RateLimitExceeded
    case 4000:
      return AggregatorServerErrorCode.BadRequest
    case 4030:
      return AggregatorServerErrorCode.Forbidden
    case 4040:
      return AggregatorServerErrorCode.HoneyPotScam
    case 5000:
      return AggregatorServerErrorCode.InsufficientLiquidity
    case 5001:
    case 5010:
      return AggregatorServerErrorCode.NotFoundRoute
    case 5030:
      return AggregatorServerErrorCode.ServiceUnavailable
    case 5040:
      return AggregatorServerErrorCode.UnsupportedApiVersion
    default:
      return AggregatorServerErrorCode.UnknownError
  }
}
