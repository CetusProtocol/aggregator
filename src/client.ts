import Decimal from "decimal.js"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { Signer } from "@mysten/sui/cryptography"
import BN from "bn.js"
import { SUI_FRAMEWORK_ADDRESS } from "@mysten/sui/utils"
import {
  Dex,
  Env,
  extractStructTagFromType,
  FindRouterParams,
  getRouterResult,
  Router,
  RouterData,
  getDeepbookV3Config,
  processEndpoint,
  DeepbookV3Config,
  getAggregatorV2PublishedAt,
  getAggregatorV2ExtendPublishedAt,
} from "."
import { Aftermath } from "./transaction/aftermath"
import { DeepbookV2 } from "./transaction/deepbook_v2"
import { KriyaV2 } from "./transaction/kriya_v2"
import { KriyaV3 } from "./transaction/kriya_v3"
import { FlowxV2 } from "./transaction/flowx_v2"
import { FlowxV3 } from "./transaction/flowx_v3"
import { Turbos } from "./transaction/turbos"
import { Cetus } from "./transaction/cetus"
import { swapInPools } from "./transaction/swap"
import { CalculateAmountLimit, CalculateAmountLimitBN } from "./math"
import { Haedal } from "./transaction/haedal"
import { Afsui } from "./transaction/afsui"
import { Volo } from "./transaction/volo"
import { Bluemove } from "./transaction/bluemove"
import { CoinAsset } from "./types/sui"
import { buildInputCoin } from "./utils/coin"
import { DeepbookV3 } from "./transaction/deepbook_v3"
import { Scallop } from "./transaction/scallop"
import { Suilend } from "./transaction/suilend"
import { Bluefin } from "./transaction/bluefin"
import { HaedalPmm } from "./transaction/haedal_pmm"
import { Alphafi } from "./transaction/alphafi"
import { CoinUtils } from "./types/CoinAssist"
import {
  SuiPriceServiceConnection,
  SuiPythClient,
} from "@pythnetwork/pyth-sui-js"
import { SteammCPMM } from "./transaction/steamm_cpmm"
import { SteammOmm } from "./transaction/steamm_omm"
import { Metastable } from "./transaction/metastable"
import { Obric } from "./transaction/obric"
import { HaWAL } from "./transaction/hawal"

export const CETUS = "CETUS"
export const DEEPBOOKV2 = "DEEPBOOK"
export const KRIYA = "KRIYA"
export const FLOWXV2 = "FLOWX"
export const FLOWXV3 = "FLOWXV3"
export const KRIYAV3 = "KRIYAV3"
export const TURBOS = "TURBOS"
export const AFTERMATH = "AFTERMATH"
export const HAEDAL = "HAEDAL"
export const VOLO = "VOLO"
export const AFSUI = "AFSUI"
export const BLUEMOVE = "BLUEMOVE"
export const DEEPBOOKV3 = "DEEPBOOKV3"
export const SCALLOP = "SCALLOP"
export const SUILEND = "SUILEND"
export const BLUEFIN = "BLUEFIN"
export const HAEDALPMM = "HAEDALPMM"
export const ALPHAFI = "ALPHAFI"
export const SPRINGSUI = "SPRINGSUI"
export const STEAMM = "STEAMM"
export const METASTABLE = "METASTABLE"
export const OBRIC = "OBRIC"
export const HAWAL = "HAWAL"
export const STEAMM_OMM = "STEAMM_OMM"
export const DEFAULT_ENDPOINT = "https://api-sui.cetus.zone/router_v2"

export type BuildRouterSwapParams = {
  routers: Router[]
  byAmountIn: boolean
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  // This parameter is used to pass the Deep token object. When using the DeepBook V3 provider,
  // users must pay fees with Deep tokens in non-whitelisted pools.
  deepbookv3DeepFee?: TransactionObjectArgument
}

export type BuildFastRouterSwapParams = {
  routers: Router[]
  byAmountIn: boolean
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  refreshAllCoins?: boolean
  payDeepFeeAmount?: number
}

export type BuildRouterSwapParamsV2 = {
  routers: RouterData
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  // This parameter is used to pass the Deep token object. When using the DeepBook V3 provider,
  // users must pay fees with Deep tokens in non-whitelisted pools.
  deepbookv3DeepFee?: TransactionObjectArgument
}

export type BuildFastRouterSwapParamsV2 = {
  routers: RouterData
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  refreshAllCoins?: boolean
  payDeepFeeAmount?: number
}

export interface SwapInPoolsParams {
  from: string
  target: string
  amount: BN
  byAmountIn: boolean
  pools: string[]
}

interface PythConfig {
  wormholeStateId: string
  pythStateId: string
}

export interface SwapInPoolsResult {
  isExceed: boolean
  routeData?: RouterData
}

function isBuilderRouterSwapParams(
  params: BuildRouterSwapParams | BuildRouterSwapParamsV2
): params is BuildRouterSwapParams {
  return Array.isArray((params as BuildRouterSwapParams).routers)
}

function isBuilderFastRouterSwapParams(
  params: BuildFastRouterSwapParams | BuildFastRouterSwapParamsV2
): params is BuildFastRouterSwapParams {
  return Array.isArray((params as BuildFastRouterSwapParams).routers)
}

export type AggregatorClientParams = {
  endpoint?: string
  signer?: string
  client?: SuiClient
  env?: Env
  pythUrls?: string[]
  apiKey?: string
  partner?: string
  overlayFeeRate?: number
  overlayFeeReceiver?: string
}

export class AggregatorClient {
  public endpoint: string
  public signer: string
  public client: SuiClient
  public env: Env
  public apiKey: string
  private allCoins: Map<string, CoinAsset[]>

  private pythConnections: SuiPriceServiceConnection[]
  private pythClient: SuiPythClient
  private overlayFeeRate: number
  private overlayFeeReceiver: string
  private partner?: string

  private static readonly CONFIG: Record<Env, PythConfig> = {
    [Env.Testnet]: {
      wormholeStateId:
        "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
      pythStateId:
        "0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c",
    },
    [Env.Mainnet]: {
      wormholeStateId:
        "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c",
      pythStateId:
        "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8",
    },
  }

  constructor(params: AggregatorClientParams) {
    this.endpoint = params.endpoint ? processEndpoint(params.endpoint) : DEFAULT_ENDPOINT
    this.client = params.client || new SuiClient({ url: getFullnodeUrl("mainnet") })
    this.signer = params.signer || ""
    this.env = params.env || Env.Mainnet
    this.allCoins = new Map<string, CoinAsset[]>()

    const config = AggregatorClient.CONFIG[this.env]
    this.pythConnections = this.newPythClients(params.pythUrls ?? [])
    this.pythClient = new SuiPythClient(
      this.client,
      config.pythStateId,
      config.wormholeStateId
    )
    this.apiKey = params.apiKey || ""
    this.partner = params.partner
    if (params.overlayFeeRate) {
      if (params.overlayFeeRate > 0 && params.overlayFeeRate <= 0.01) {
        this.overlayFeeRate = params.overlayFeeRate * 1000000
      } else {
        throw new Error("Overlay fee rate must be between 0 and 0.01")
      }
    } else {
      this.overlayFeeRate = 0
    }
    this.overlayFeeReceiver = params.overlayFeeReceiver ?? "0x0"
  }

  newPythClients(pythUrls: string[]) {
    if (!pythUrls.includes("https://hermes.pyth.network")) {
      pythUrls.push("https://hermes.pyth.network")
    }

    const connections = pythUrls.map(url => new SuiPriceServiceConnection(url, { timeout: 3000 }))
    return connections
  }

  async getCoins(
    coinType: string,
    refresh: boolean = true
  ): Promise<CoinAsset[]> {
    if (this.signer === "") {
      throw new Error("Signer is required, but not provided.")
    }

    let cursor = null
    let limit = 50

    if (!refresh) {
      const gotFromCoins = this.allCoins.get(coinType)
      if (gotFromCoins) {
        return gotFromCoins
      }
    }

    const allCoins: CoinAsset[] = []
    while (true) {
      try {
        const gotCoins = await this.client.getCoins({
          owner: this.signer,
          coinType,
          cursor,
          limit,
        })
        for (const coin of gotCoins.data) {
          allCoins.push({
            coinAddress: extractStructTagFromType(coin.coinType).source_address,
            coinObjectId: coin.coinObjectId,
            balance: BigInt(coin.balance),
          })
        }
        if (!gotCoins.hasNextPage) {
          break
        }
        cursor = gotCoins.nextCursor
      } catch (e) {
        console.error("getCoins error:", e)
        break
      }
    }

    this.allCoins.set(coinType, allCoins)
    return allCoins
  }

  async findRouters(params: FindRouterParams): Promise<RouterData | null> {
    return getRouterResult(this.endpoint, this.apiKey, params, this.overlayFeeRate, this.overlayFeeReceiver)
  }

  async executeFlexibleInputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routers: Router[],
    expectedAmountOut: string,
    amountLimit: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    deepbookv3DeepFee?: TransactionObjectArgument,
    packages?: Map<string, string>,
  ) {
    if (routers.length === 0) {
      throw new Error("No router found")
    }
    
    const outputCoinType = routers[0].path[routers[0].path.length - 1].target
    const outputCoins = []
    
    for (let i = 0; i < routers.length - 1; i++) {
      if (routers[i].path.length === 0) {
        throw new Error("Empty path")
      }
      const splitCoin = txb.splitCoins(inputCoin, [routers[i].amountIn.toString()])
      let nextCoin = splitCoin[0] as TransactionObjectArgument
      
      for (const path of routers[i].path) {
        const dex = this.newDex(path.provider, pythPriceIDs, partner)
        nextCoin = await dex.swap(
          this,
          txb,
          path,
          nextCoin,
          packages,
          deepbookv3DeepFee
        )
      }
      outputCoins.push(nextCoin)
    }

    if (routers[routers.length - 1].path.length === 0) {
      throw new Error("Empty path")
    }
    let lastCoin = inputCoin
    for (const path of routers[routers.length - 1].path) {
      const dex = this.newDex(path.provider, pythPriceIDs, partner)
      lastCoin = await dex.swap(
        this,
        txb,
        path,
        lastCoin,
        packages,
        deepbookv3DeepFee
      )
    }
    outputCoins.push(lastCoin)

    const aggregatorV2ExtendPublishedAt = getAggregatorV2ExtendPublishedAt(
      this.publishedAtV2Extend(),
      packages
    )

    const mergedTargetCoin = this.checkCoinThresholdAndMergeCoin(
      txb,
      outputCoins,
      outputCoinType,
      expectedAmountOut,
      amountLimit,
      aggregatorV2ExtendPublishedAt
    )
    return mergedTargetCoin
  }

  async expectInputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routers: Router[],
    expectedAmountOut: string,
    amountLimit: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    deepbookv3DeepFee?: TransactionObjectArgument,
    packages?: Map<string, string>,
  ) {
    if (routers.length === 0) {
      throw new Error("No router found")
    }
    const splitAmounts = routers.map((router) => router.amountIn.toString())
    const inputCoinType = routers[0].path[0].from
    const outputCoinType = routers[0].path[routers[0].path.length - 1].target
    const inputCoins = txb.splitCoins(inputCoin, splitAmounts)
    const outputCoins = []
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].path.length === 0) {
        throw new Error("Empty path")
      }
      let nextCoin = inputCoins[i] as TransactionObjectArgument
      for (const path of routers[i].path) {
        const dex = this.newDex(path.provider, pythPriceIDs, partner)
        nextCoin = await dex.swap(
          this,
          txb,
          path,
          nextCoin,
          packages,
          deepbookv3DeepFee
        )
      }

      outputCoins.push(nextCoin)
    }

    const aggregatorV2PublishedAt = getAggregatorV2PublishedAt(
      this.publishedAtV2(),
      packages
    )

    const aggregatorV2ExtendPublishedAt = getAggregatorV2ExtendPublishedAt(
      this.publishedAtV2Extend(),
      packages
    )

    this.transferOrDestoryCoin(
      txb,
      inputCoin,
      inputCoinType,
      aggregatorV2PublishedAt
    )
    const mergedTargetCoins = this.checkCoinThresholdAndMergeCoin(
      txb,
      outputCoins,
      outputCoinType,
      expectedAmountOut,
      amountLimit,
      aggregatorV2ExtendPublishedAt
    )
    return mergedTargetCoins
  }

  async expectOutputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routers: Router[],
    partner?: string,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const returnCoins: TransactionObjectArgument[] = []
    const receipts: TransactionObjectArgument[] = []
    const targetCoins = []
    const dex = new Cetus(this.env, partner)

    const aggregatorV2PublishedAt = getAggregatorV2PublishedAt(
      this.publishedAtV2(),
      packages
    )

    for (let i = 0; i < routers.length; i++) {
      const router = routers[i]
      for (let j = router.path.length - 1; j >= 0; j--) {
        const path = router.path[j]
        const flashSwapResult = dex.flash_swap(this, txb, path, false)
        returnCoins.unshift(flashSwapResult.targetCoin)
        receipts.unshift(flashSwapResult.flashReceipt)
      }

      let nextRepayCoin = inputCoin
      for (let j = 0; j < router.path.length; j++) {
        const path = router.path[j]
        const repayResult = dex.repay_flash_swap(
          this,
          txb,
          path,
          nextRepayCoin,
          receipts[j]
        )
        nextRepayCoin = returnCoins[j]
        if (j === 0) {
          inputCoin = repayResult
        } else {
          this.transferOrDestoryCoin(
            txb,
            repayResult,
            path.from,
            aggregatorV2PublishedAt
          )
        }
        if (j === router.path.length - 1) {
          targetCoins.push(nextRepayCoin)
        }
      }
    }
    const inputCoinType = routers[0].path[0].from
    this.transferOrDestoryCoin(
      txb,
      inputCoin,
      inputCoinType,
      aggregatorV2PublishedAt
    )
    if (targetCoins.length > 1) {
      const vec = txb.makeMoveVec({ elements: targetCoins.slice(1) })
      txb.moveCall({
        target: `${SUI_FRAMEWORK_ADDRESS}::pay::join_vec`,
        typeArguments: [routers[0].path[routers[0].path.length - 1].target],
        arguments: [targetCoins[0], vec],
      })
    }

    return targetCoins[0]
  }

  async swapInPools(
    params: SwapInPoolsParams
  ): Promise<SwapInPoolsResult | null> {
    let result
    try {
      result = await swapInPools(this.client, params, this.signer, this.env)
    } catch (e) {
      console.error("swapInPools error:", e)
      return null
    }
    return result
  }

  async routerSwap(
    params: BuildRouterSwapParams | BuildRouterSwapParamsV2
  ): Promise<TransactionObjectArgument> {
    const { routers, inputCoin, slippage, txb, deepbookv3DeepFee, partner } =
      params

    if (slippage > 1 || slippage < 0) {
      throw new Error("Invalid slippage value. Must be between 0 and 1 (e.g., 0.01 represents 1% slippage)")
    }

    const routerData = Array.isArray(routers) ? routers : routers.routes
    const byAmountIn = isBuilderRouterSwapParams(params)
      ? params.byAmountIn
      : params.routers.byAmountIn

    const amountIn = routerData.reduce(
      (acc, router) => acc.add(router.amountIn),
      new BN(0)
    )
    const amountOut = routerData.reduce(
      (acc, router) => acc.add(router.amountOut),
      new BN(0)
    )

    let overlayFee = new BN(0)
    if (this.overlayFeeRate > 0 && this.overlayFeeReceiver !== "0x0") {
      if (byAmountIn) {
        overlayFee = amountOut.mul(new BN(this.overlayFeeRate)).div(new BN(1000000))
      } else {
        overlayFee = amountIn.mul(new BN(this.overlayFeeRate)).div(new BN(1000000))
      }
    }

    const expectedAmountOut = byAmountIn ? amountOut.sub(overlayFee) : amountOut
    const expectedAmountIn = byAmountIn ? amountIn : amountIn.add(overlayFee)

    const amountLimit = CalculateAmountLimitBN(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )

    const packages = isBuilderRouterSwapParams(params)
      ? undefined
      : params.routers.packages

    const aggregatorV2PublishedAt = getAggregatorV2PublishedAt(
      this.publishedAtV2(),
      packages
    )

    const priceIDs = findPythPriceIDs(routerData)

    const priceInfoObjectIds =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    if (byAmountIn) {
      const targetCoin = await this.expectInputSwap(
        txb,
        inputCoin,
        routerData,
        amountOut.toString(),
        amountLimit.toString(),
        priceInfoObjectIds,
        partner ?? this.partner,
        deepbookv3DeepFee,
        packages
      )
      return targetCoin
    }
    const overlayFeeCoin = txb.splitCoins(inputCoin, [
      overlayFee.toString(),
    ])
    if (this.overlayFeeRate > 0 && this.overlayFeeReceiver !== "0x0") {
      txb.transferObjects([overlayFeeCoin], this.overlayFeeReceiver)
    }

    // When exact output, we will set slippage limit in split coin.
    const splitedInputCoins = txb.splitCoins(inputCoin, [
      amountLimit.sub(overlayFee).toString(),
    ])
    this.transferOrDestoryCoin(
      txb,
      inputCoin,
      routerData[0].path[0].from,
      aggregatorV2PublishedAt
    )
    const targetCoin = await this.expectOutputSwap(
      txb,
      splitedInputCoins[0],
      routerData,
      partner ?? this.partner
    )
    return targetCoin
  }

  async fixableRouterSwap(
    params: BuildRouterSwapParamsV2
  ): Promise<TransactionObjectArgument> {
    const { routers, inputCoin, slippage, txb, deepbookv3DeepFee, partner } =
      params

    const routerData = Array.isArray(routers) ? routers : routers.routes
    const byAmountIn = params.routers.byAmountIn

    const amountIn = routerData.reduce(
      (acc, router) => acc.add(router.amountIn),
      new BN(0)
    )
    const amountOut = routerData.reduce(
      (acc, router) => acc.add(router.amountOut),
      new BN(0)
    )
    let overlayFee = 0
    if (this.overlayFeeRate > 0 && this.overlayFeeReceiver !== "0x0") {
      if (byAmountIn) {
        overlayFee = Number(amountOut.mul(new BN(this.overlayFeeRate)).div(new BN(1000000)).toString())
      } else {
        overlayFee = Number(amountIn.mul(new BN(this.overlayFeeRate)).div(new BN(1000000)).toString())
      }
    }

    const expectedAmountOut = byAmountIn ? amountOut.sub(new BN(overlayFee)) : amountOut
    const expectedAmountIn = byAmountIn ? amountIn : amountIn.add(new BN(overlayFee))

    const amountLimit = CalculateAmountLimitBN(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )

    const packages = isBuilderRouterSwapParams(params)
      ? undefined
      : params.routers.packages

    const priceIDs = findPythPriceIDs(routerData)

    const priceInfoObjectIds =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    if (byAmountIn) {
      const targetCoin = await this.executeFlexibleInputSwap(
        txb,
        inputCoin,
        routerData,
        expectedAmountOut.toString(),
        amountLimit.toString(),
        priceInfoObjectIds,
        partner ?? this.partner,
        deepbookv3DeepFee,
        packages
      )
      return targetCoin
    }

    const targetCoin = await this.expectOutputSwap(
      txb,
      inputCoin,
      routerData,
      partner ?? this.partner
    )
    return targetCoin
  }

  // auto build input coin
  // auto merge, transfer or destory target coin.
  async fastRouterSwap(
    params: BuildFastRouterSwapParams | BuildFastRouterSwapParamsV2
  ) {
    const {
      routers,
      slippage,
      txb,
      partner,
      refreshAllCoins,
      payDeepFeeAmount
    } = params

    const routerData = Array.isArray(routers) ? routers : routers.routes
    const fromCoinType = routerData[0].path[0].from
    let fromCoins = await this.getCoins(fromCoinType, refreshAllCoins)

    const targetCoinType =
      routerData[0].path[routerData[0].path.length - 1].target
    const amountIn = routerData.reduce(
      (acc, router) => acc.add(router.amountIn),
      new BN(0)
    )
    const amountOut = routerData.reduce(
      (acc, router) => acc.add(router.amountOut),
      new BN(0)
    )

    const byAmountIn = isBuilderFastRouterSwapParams(params)
      ? params.byAmountIn
      : params.routers.byAmountIn
    

    let overlayFee = 0
    if (this.overlayFeeRate > 0 && this.overlayFeeReceiver !== "0x0") {
      if (byAmountIn) {
        overlayFee = Number(amountOut.mul(new BN(this.overlayFeeRate)).div(new BN(1000000)).toString())
      } else {
        overlayFee = Number(amountIn.mul(new BN(this.overlayFeeRate)).div(new BN(1000000)).toString())
      }
    }

    const expectedAmountOut = byAmountIn ? amountOut.sub(new BN(overlayFee)) : amountOut
    const expectedAmountIn = byAmountIn ? amountIn : amountIn.add(new BN(overlayFee))
    
    const amountLimit = CalculateAmountLimit(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )
    const amount = byAmountIn ? expectedAmountIn : amountLimit
    const buildFromCoinRes = buildInputCoin(
      txb,
      fromCoins,
      BigInt(amount.toString()),
      fromCoinType
    )

    let deepCoin
    if (payDeepFeeAmount && payDeepFeeAmount > 0) {
      let deepCoins = await this.getCoins(this.deepbookv3DeepFeeType())
      deepCoin = buildInputCoin(
        txb,
        deepCoins,
        BigInt(payDeepFeeAmount),
        this.deepbookv3DeepFeeType()
      ).targetCoin
    }

    const routerSwapParams = isBuilderFastRouterSwapParams(params)
      ? {
          routers: routerData,
          inputCoin: buildFromCoinRes.targetCoin,
          slippage,
          byAmountIn,
          txb,
          partner: partner ?? this.partner,
          deepbookv3DeepFee: deepCoin
        }
      : {
          routers: params.routers,
          inputCoin: buildFromCoinRes.targetCoin,
          slippage,
          byAmountIn,
          txb,
          partner: partner ?? this.partner,
          deepbookv3DeepFee: deepCoin
        }

    const targetCoin = await this.routerSwap(routerSwapParams)

    if (CoinUtils.isSuiCoin(targetCoinType)) {
      txb.mergeCoins(txb.gas, [targetCoin])
    } else {
      let targetCoins = await this.getCoins(targetCoinType, refreshAllCoins)
      const targetCoinRes = buildInputCoin(
        txb,
        targetCoins,
        BigInt(0),
        targetCoinType
      )

      const packages = isBuilderFastRouterSwapParams(params)
        ? undefined
        : params.routers.packages
      const aggregatorV2PublishedAt = getAggregatorV2PublishedAt(
        this.publishedAtV2(),
        packages
      )

      txb.mergeCoins(targetCoinRes.targetCoin, [targetCoin])
      if (targetCoinRes.isMintZeroCoin) {
        this.transferOrDestoryCoin(
          txb,
          targetCoinRes.targetCoin,
          targetCoinType,
          aggregatorV2PublishedAt
        )
      }
    }
  }

  // Include cetus、deepbookv2、flowxv2 & v3、kriyav2 & v3、turbos、aftermath、haedal、afsui、volo、bluemove
  publishedAtV2(): string {
    if (this.env === Env.Mainnet) {
      // return "0x3fb42ddf908af45f9fc3c59eab227888ff24ba2e137b3b55bf80920fd47e11af" // version 6
      // return "0xf9c6f78322ed667909e05f6b42b2f5a67af6297503c905335e02a15148e9440d" // version 7
      // return "0x2485feb9d42c7c3bcb8ecde555ad40f1b073d9fb4faf354fa2d30a0b183a23ce" // version 8
      return "0x3864c7c59a4889fec05d1aae4bc9dba5a0e0940594b424fbed44cb3f6ac4c032" // version 9
      // return "0x803db8dfcc86fc1afbc7d2212bd14ec9690978ddebea0d590e01147d6b17aa06" // pre
    } else {
      // return "0x0ed287d6c3fe4962d0994ffddc1d19a15fba6a81533f3f0dcc2bbcedebce0637" // version 2
      return "0x52eae33adeb44de55cfb3f281d4cc9e02d976181c0952f5323648b5717b33934"
    }
  }

  // Include deepbookv3, scallop, bluefin
  publishedAtV2Extend(): string {
    if (this.env === Env.Mainnet) {
      // return "0x43811be4677f5a5de7bf2dac740c10abddfaa524aee6b18e910eeadda8a2f6ae" // version 1, deepbookv3
      // return "0x6d70ffa7aa3f924c3f0b573d27d29895a0ee666aaff821073f75cb14af7fd01a" // version 3, deepbookv3 & scallop
      // return "0x16d9418726c26d8cb4ce8c9dd75917fa9b1c7bf47d38d7a1a22603135f0f2a56" // version 4, add suilend
      // return "0x3b6d71bdeb8ce5b06febfd3cfc29ecd60d50da729477c8b8038ecdae34541b91" // version 5, add bluefin
      // return "0x81ade554cb24a7564ca43a4bfb7381b08d9e5c5f375162c95215b696ab903502" // version 6, force upgrade scallop
      // return "0x347dd58bbd11cd82c8b386b344729717c04a998da73386e82a239cc196d5706b" // version 7
      // return "0xf2fcea41dc217385019828375764fa06d9bd25e8e4726ba1962680849fb8d613" // version 8
      // return "0xa2d8a4279d69d8fec04b2fea8852d0d467d3cc0d39c5890180d439ae7a9953ed" // version 9
      // return "0x34ef25b60b51f9d07cd9b7dc5b08dfdf26c7b0ff00c57bb17454c161fa6b6b83" // version 10
      // return "0xf57be4b9f9036034b1c5484d299d8fb68d5f43862d6afe8886d67db293dfc4bc" // version 11
      // return "0x200e762fa2c49f3dc150813038fbf22fd4f894ac6f23ebe1085c62f2ef97f1ca" // version 12
      // return "0x3b6239bc9bccfdc6b702fd971f5f1999a724d6335f0146d7d5a0ff8dcadcefb8" // version 13
      return "0x39402d188b7231036e52266ebafad14413b4bf3daea4ac17115989444e6cd516" // version 14
    } else {
      return "0xabb6a81c8a216828e317719e06125de5bb2cb0fe8f9916ff8c023ca5be224c78"
    }
  }

  publishedAtV2Extend2(): string {
    if (this.env === Env.Mainnet) {
      return "0x368d13376443a8051b22b42a9125f6a3bc836422bb2d9c4a53984b8d6624c326"
    } else {
      return "0x0"
    }
  }

  deepbookv3DeepFeeType(): string {
    if (this.env === Env.Mainnet) {
      return "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP"
    } else {
      return "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP"
    }
  }

  transferOrDestoryCoin(
    txb: Transaction,
    coin: TransactionObjectArgument,
    coinType: string,
    aggregatorV2PublishedAt: string
  ) {
    txb.moveCall({
      target: `${aggregatorV2PublishedAt}::utils::transfer_or_destroy_coin`,
      typeArguments: [coinType],
      arguments: [coin],
    })
  }

  checkCoinThresholdAndMergeCoin(
    txb: Transaction,
    coins: TransactionObjectArgument[],
    coinType: string,
    expectedAmountOut: string,
    threshold: string,
    aggregatorV2ExtendPublishedAt: string,
  ) {
    let targetCoin = coins[0]
    if (coins.length > 1) {
      let vec = txb.makeMoveVec({ elements: coins.slice(1) })
      txb.moveCall({
        target: `${SUI_FRAMEWORK_ADDRESS}::pay::join_vec`,
        typeArguments: [coinType],
        arguments: [coins[0], vec],
      })
      targetCoin = coins[0]
    }

    if (this.overlayFeeRate === 0 || this.overlayFeeReceiver === "0x0") {
      txb.moveCall({
        target: `${aggregatorV2ExtendPublishedAt}::utils::check_coin_threshold_v1`,
        typeArguments: [coinType],
        arguments: [
          targetCoin, 
          txb.pure.u64(expectedAmountOut), 
          txb.pure.u64(threshold)
        ],
      })
    } else {
      txb.moveCall({
        target: `${aggregatorV2ExtendPublishedAt}::utils::check_coin_threshold_v2`,
        typeArguments: [coinType],
        arguments: [
          targetCoin, 
          txb.pure.u64(expectedAmountOut), 
          txb.pure.u64(threshold), 
          txb.pure.u64(this.overlayFeeRate), 
          txb.pure.address(this.overlayFeeReceiver)
        ],
      })
    }

    return targetCoin
  }

  newDex(
    provider: string,
    pythPriceIDs: Map<string, string>,
    partner?: string
  ): Dex {
    switch (provider) {
      case CETUS:
        return new Cetus(this.env, partner)
      case DEEPBOOKV2:
        return new DeepbookV2(this.env)
      case DEEPBOOKV3:
        return new DeepbookV3(this.env)
      case KRIYA:
        return new KriyaV2(this.env)
      case KRIYAV3:
        return new KriyaV3(this.env)
      case FLOWXV2:
        return new FlowxV2(this.env)
      case FLOWXV3:
        return new FlowxV3(this.env)
      case TURBOS:
        return new Turbos(this.env)
      case AFTERMATH:
        return new Aftermath(this.env)
      case HAEDAL:
        return new Haedal(this.env)
      case AFSUI:
        return new Afsui(this.env)
      case VOLO:
        return new Volo(this.env)
      case BLUEMOVE:
        return new Bluemove(this.env)
      case SCALLOP:
        return new Scallop(this.env)
      case SUILEND:
        return new Suilend(this.env)
      case SPRINGSUI:
        return new Suilend(this.env)
      case BLUEFIN:
        return new Bluefin(this.env)
      case HAEDALPMM:
        return new HaedalPmm(this.env, pythPriceIDs)
      case ALPHAFI:
        return new Alphafi(this.env)
      case STEAMM:
        return new SteammCPMM(this.env)
      case STEAMM_OMM:
        return new SteammOmm(this.env, pythPriceIDs)
      case METASTABLE:
        return new Metastable(this.env, pythPriceIDs)
      case OBRIC:
        return new Obric(this.env, pythPriceIDs)
      case HAWAL:
        return new HaWAL(this.env)
      default:
        throw new Error(`Unsupported dex ${provider}`)
    }
  }

  async signAndExecuteTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showBalanceChanges: true,
      },
    })
    return res
  }

  async devInspectTransactionBlock(txb: Transaction) {
    const res = await this.client.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: this.signer,
    })

    return res
  }

  async sendTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
    })
    return res
  }

  async getDeepbookV3Config(): Promise<DeepbookV3Config | null> {
    const res = await getDeepbookV3Config(this.endpoint)
    if (res) {
      return res.data
    }
    return null
  }

  async updatePythPriceIDs(
    priceIDs: string[],
    txb: Transaction
  ): Promise<Map<string, string>> {
    let priceUpdateData: Buffer[] | null = null
    let lastError: Error | null = null

    for (const connection of this.pythConnections) {
      try {
        priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs)
        break
      } catch (e) {
        lastError = e as Error
        console.log("Error: ", e)
        continue
      }
    }

    if (priceUpdateData == null) {
      throw new Error(
        `All Pyth price nodes are unavailable. Cannot fetch price data. Please switch to or add new available Pyth nodes. Detailed error: ${lastError?.message}`
      )
    }

    let priceInfoObjectIds = []
    try {
      priceInfoObjectIds = await this.pythClient.updatePriceFeeds(
        txb,
        priceUpdateData,
        priceIDs
      )
    } catch (e) {
      throw new Error(`All Pyth price nodes are unavailable. Cannot fetch price data. Please switch to or add new available Pyth nodes in the pythUrls parameter when initializing AggregatorClient, for example: new AggregatorClient({ pythUrls: ["https://your-pyth-node-url"] }). Detailed error: ${e}`)
    }

    let priceInfoObjectIdsMap = new Map<string, string>()
    for (let i = 0; i < priceIDs.length; i++) {
      priceInfoObjectIdsMap.set(priceIDs[i], priceInfoObjectIds[i])
    }
    return priceInfoObjectIdsMap
  }
}

export function findPythPriceIDs(routes: Router[]): string[] {
  const priceIDs = new Set<string>()

  for (const route of routes) {
    for (const path of route.path) {
      if (path.provider === HAEDALPMM) {
        if (
          path.extendedDetails &&
          path.extendedDetails.haedalPmmBasePriceSeed &&
          path.extendedDetails.haedalPmmQuotePriceSeed
        ) {
          priceIDs.add(path.extendedDetails.haedalPmmBasePriceSeed)
          priceIDs.add(path.extendedDetails.haedalPmmQuotePriceSeed)
        }
      }
      if (path.provider === METASTABLE) {
        if (path.extendedDetails && path.extendedDetails.metastablePriceSeed) {
          priceIDs.add(path.extendedDetails.metastablePriceSeed)
        }
        if (path.extendedDetails && path.extendedDetails.metastableETHPriceSeed) {
          priceIDs.add(path.extendedDetails.metastableETHPriceSeed)
        }
      }
      if (path.provider === OBRIC) {
        if (path.extendedDetails && path.extendedDetails.obricCoinAPriceSeed) {
          priceIDs.add(path.extendedDetails.obricCoinAPriceSeed)
        }
        if (path.extendedDetails && path.extendedDetails.obricCoinBPriceSeed) {
          priceIDs.add(path.extendedDetails.obricCoinBPriceSeed)
        }
      }
      if (path.provider === STEAMM_OMM) {
        if (path.extendedDetails && path.extendedDetails.steammOraclePythPriceSeedA) {
          priceIDs.add(path.extendedDetails.steammOraclePythPriceSeedA)
        }
        if (path.extendedDetails && path.extendedDetails.steammOraclePythPriceSeedB) {
          priceIDs.add(path.extendedDetails.steammOraclePythPriceSeedB)
        }
      }
    }
  }
  return Array.from(priceIDs)
}

export function parseRouterResponse(
  data: any,
  byAmountIn: boolean
): RouterData {
  let totalDeepFee = 0
  for (const route of data.routes) {
    for (const path of route.path) {
      if (path.extended_details && path.extended_details.deepbookv3_deep_fee) {
        totalDeepFee += Number(path.extended_details.deepbookv3_deep_fee)
      }
    }
  }

  let packages = undefined
  if (data.packages != null) {
    packages = new Map<string, string>()
    for (const [key, value] of Object.entries(data.packages)) {
      packages.set(key, value as string)
    }
  }

  let routerData: RouterData = {
    amountIn: new BN(data.amount_in.toString()),
    amountOut: new BN(data.amount_out.toString()),
    byAmountIn,
    insufficientLiquidity: false,
    routes: data.routes.map((route: any) => {
      return {
        path: route.path.map((path: any) => {
          let version
          if (path.provider === AFTERMATH) {
            version =
              path.extended_details.aftermath_pool_flatness === 0 ? "v2" : "v3"
          }

          console.log("path: ", path.extended_details)

          let extendedDetails
          if (
            path.provider === TURBOS ||
            path.provider === AFTERMATH ||
            path.provider === CETUS ||
            path.provider === DEEPBOOKV3 ||
            path.provider === SCALLOP ||
            path.provider === HAEDALPMM ||
            path.provider === METASTABLE ||
            path.provider === OBRIC ||
            path.provider === STEAMM ||
            path.provider === STEAMM_OMM
          ) {
            extendedDetails = {
              aftermathLpSupplyType:
                path.extended_details?.aftermath_lp_supply_type,
              turbosFeeType: path.extended_details?.turbos_fee_type,
              afterSqrtPrice: path.extended_details?.after_sqrt_price,
              deepbookv3DeepFee: path.extended_details?.deepbookv3_deep_fee,
              scallopScoinTreasury:
                path.extended_details?.scallop_scoin_treasury,
              haedalPmmBasePriceSeed:
                path.extended_details?.haedal_pmm_base_price_seed,
              haedalPmmQuotePriceSeed:
                path.extended_details?.haedal_pmm_quote_price_seed,
              steammBankA: path.extended_details?.steamm_bank_a,
              steammBankB: path.extended_details?.steamm_bank_b,
              steammLendingMarket: path.extended_details?.steamm_lending_market,
              steammLendingMarketType: path.extended_details?.steamm_lending_market_type,
              steammBCoinAType: path.extended_details?.steamm_btoken_a_type,
              steammBCoinBType: path.extended_details?.steamm_btoken_b_type,
              steammLPToken: path.extended_details?.steamm_lp_token_type,
              steammOracleRegistryId: path.extended_details?.steamm_oracle_registry_id,
              steammOracleIndexA: path.extended_details?.steamm_oracle_index_a,
              steammOracleIndexB: path.extended_details?.steamm_oracle_index_b,
              steammOraclePythPriceSeedA: path.extended_details?.steamm_oracle_pyth_price_seed_a,
              steammOraclePythPriceSeedB: path.extended_details?.steamm_oracle_pyth_price_seed_b,
              metastablePriceSeed: path.extended_details?.metastable_price_seed,
              metastableETHPriceSeed: path.extended_details?.metastable_eth_price_seed,
              metastableWhitelistedAppId: path.extended_details?.metastable_whitelisted_app_id,
              metastableCreateCapPkgId: path.extended_details?.metastable_create_cap_pkg_id,
              metastableCreateCapModule: path.extended_details?.metastable_create_cap_module,
              metastableCreateCapAllTypeParams: path.extended_details?.metastable_create_cap_all_type_params,
              metastableRegistryId: path.extended_details?.metastable_registry_id,
              obricCoinAPriceSeed: path.extended_details?.obric_coin_a_price_seed,
              obricCoinBPriceSeed: path.extended_details?.obric_coin_b_price_seed,
              obricCoinAPriceId: path.extended_details?.obric_coin_a_price_id,
              obricCoinBPriceId: path.extended_details?.obric_coin_b_price_id,
            }
          }

          return {
            id: path.id,
            direction: path.direction,
            provider: path.provider,
            from: path.from,
            target: path.target,
            feeRate: path.fee_rate,
            amountIn: path.amount_in,
            amountOut: path.amount_out,
            extendedDetails,
            version,
          }
        }),
        amountIn: new BN(route.amount_in.toString()),
        amountOut: new BN(route.amount_out.toString()),
        initialPrice: new Decimal(route.initial_price.toString()),
      }
    }),
    totalDeepFee,
    packages,
  }

  return routerData
}
