import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import BN from "bn.js"
import {
  FindRouterParams,
  Path,
  RouterDataV3,
  MergeSwapParams,
  BuildMergeSwapParams,
  BuildFastMergeSwapParams,
  MergeSwapInputCoin,
  MergeSwapRouterData,
  DeepbookV3ConfigResponse,
} from "./types/shared"
import {
  getRouterResult,
  processFlattenRoutes,
  getMergeSwapResult,
  getDeepbookV3Config,
} from "./api"
import { Env } from "./config"
import { CalculateAmountLimit, CalculateAmountLimitBN } from "./math"
import { CoinUtils } from "./types/CoinAssist"
import * as Constants from "./const"
import { DexRouter } from "./movecall"
import { CetusRouter } from "./movecall/cetus"
import { KriyaV3Router } from "./movecall/kriya_v3"
import { FlowxV3Router } from "./movecall/flowx_v3"
import { TurbosRouter } from "./movecall/turbos"
import { BluefinRouter } from "./movecall/bluefin"
import { MomentumRouter } from "./movecall/momentum"
import { MagmaRouter } from "./movecall/magma"
import { KriyaV2Router } from "./movecall/kriya_v2"
import { FlowxV2Router } from "./movecall/flowx_v2"
import { BluemoveRouter } from "./movecall/bluemove"
import { DeepbookV3Router } from "./movecall/deepbook_v3"
import { AftermathRouter } from "./movecall/aftermath"
import { SteammCPMMRouter } from "./movecall/steamm_cpmm"
import { ScallopRouter } from "./movecall/scallop"
import { SpringsuiRouter } from "./movecall/springsui"
import { HaedalPmmRouter } from "./movecall/haedal_pmm"
import { ObricRouter } from "./movecall/obric"
import { SevenkRouter } from "./movecall/sevenk"
import { SteammOmmRouter } from "./movecall/steamm_omm"
import { SteammOmmV2Router } from "./movecall/steamm_omm_v2"
import { MetastableRouter } from "./movecall/metastable"
import { AlphafiRouter } from "./movecall/alphafi"
import { VoloRouter } from "./movecall/volo"
import { AfsuiRouter } from "./movecall/afsui"
import { HaedalRouter } from "./movecall/haedal"
import { HawalRouter } from "./movecall/hawal"
import {
  newSwapContext,
  newSwapContextV2,
  confirmSwap,
  transferOrDestroyCoin,
  takeBalance,
  transferBalance,
} from "./movecall/router"
import { completionCoin, compareCoins } from "./utils/coin"
import { coinWithBalance } from "@mysten/sui/transactions"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { PythAdapter } from "./pyth/adapter"
import { processEndpoint } from "./utils"
import { Signer } from "@mysten/sui/cryptography"
import { HaedalHMMV2Router } from "./movecall/haedal_hmm_v2"
import { FullsailRouter } from "./movecall/fullsail"
import { CetusDlmmRouter } from "./movecall/cetus_dlmm"
import { FerraDlmmRouter } from "./movecall/ferra_dlmm"
import { FerraClmmRouter } from "./movecall/ferra_clmm"
import { BoltRouter } from "./movecall/bolt"

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
export const MOMENTUM = "MOMENTUM"
export const STEAMM_OMM_V2 = "STEAMM_OMM_V2"
export const MAGMA = "MAGMA"
/** @deprecated SevenK DEX is no longer active. Will be removed in a future version. */
export const SEVENK = "SEVENK"
export const HAEDALHMMV2 = "HAEDALHMMV2"
export const FULLSAIL = "FULLSAIL"
export const CETUSDLMM = "CETUSDLMM"
export const FERRADLMM = "FERRADLMM"
export const FERRACLMM = "FERRACLMM"
export const BOLT = "BOLT"
export const DEFAULT_ENDPOINT = "https://api-sui.cetus.zone/router_v3"

export const ALL_DEXES = [
  CETUS,
  KRIYA,
  FLOWXV2,
  FLOWXV3,
  KRIYAV3,
  TURBOS,
  AFTERMATH,
  HAEDAL,
  VOLO,
  AFSUI,
  BLUEMOVE,
  DEEPBOOKV3,
  SCALLOP,
  SUILEND,
  BLUEFIN,
  HAEDALPMM,
  ALPHAFI,
  SPRINGSUI,
  STEAMM,
  METASTABLE,
  OBRIC,
  HAWAL,
  MOMENTUM,
  STEAMM_OMM,
  STEAMM_OMM_V2,
  MAGMA,
  SEVENK,
  HAEDALHMMV2,
  FULLSAIL,
  CETUSDLMM,
  FERRADLMM,
  FERRACLMM,
  BOLT,
]

export type BuildRouterSwapParamsV3 = {
  router: RouterDataV3
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  cetusDlmmPartner?: string
  // This parameter is used to pass the Deep token object. When using the DeepBook V3 provider,
  // users must pay fees with Deep tokens in non-whitelisted pools.
  deepbookv3DeepFee?: TransactionObjectArgument
  fixable?: boolean
}

export type BuildFastRouterSwapParamsV3 = {
  router: RouterDataV3
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  cetusDlmmPartner?: string
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

export interface SwapInPoolsResultV3 {
  isExceed: boolean
  routeData?: RouterDataV3
}

export function getAllProviders(): string[] {
  return ALL_DEXES
}

/**
 * Get all providers excluding the specified ones
 * @param excludeProviders Array of provider names to exclude
 * @returns Filtered provider list
 */
export function getProvidersExcluding(excludeProviders: string[]): string[] {
  return ALL_DEXES.filter(provider => !excludeProviders.includes(provider))
}

/**
 * Get only the specified providers
 * @param includeProviders Array of provider names to include
 * @returns Filtered provider list
 */
export function getProvidersIncluding(includeProviders: string[]): string[] {
  return ALL_DEXES.filter(provider => includeProviders.includes(provider))
}

function findPythPriceIDs(paths: Path[]): string[] {
  const priceIDs = new Set<string>()

  for (const path of paths) {
    if (path.provider === HAEDALPMM) {
      if (
        path.extendedDetails &&
        path.extendedDetails.haedal_pmm_base_price_seed &&
        path.extendedDetails.haedal_pmm_quote_price_seed
      ) {
        priceIDs.add(path.extendedDetails.haedal_pmm_base_price_seed)
        priceIDs.add(path.extendedDetails.haedal_pmm_quote_price_seed)
      }
    }
    if (path.provider === METASTABLE) {
      if (path.extendedDetails && path.extendedDetails.metastable_price_seed) {
        priceIDs.add(path.extendedDetails.metastable_price_seed)
      }
      if (
        path.extendedDetails &&
        path.extendedDetails.metastable_eth_price_seed
      ) {
        priceIDs.add(path.extendedDetails.metastable_eth_price_seed)
      }
    }
    if (path.provider === OBRIC) {
      if (
        path.extendedDetails &&
        path.extendedDetails.obric_coin_a_price_seed
      ) {
        priceIDs.add(path.extendedDetails.obric_coin_a_price_seed)
      }
      if (
        path.extendedDetails &&
        path.extendedDetails.obric_coin_b_price_seed
      ) {
        priceIDs.add(path.extendedDetails.obric_coin_b_price_seed)
      }
    }
    if (path.provider === STEAMM_OMM || path.provider === STEAMM_OMM_V2) {
      if (
        path.extendedDetails &&
        path.extendedDetails.steamm_oracle_pyth_price_seed_a
      ) {
        priceIDs.add(path.extendedDetails.steamm_oracle_pyth_price_seed_a)
      }
      if (
        path.extendedDetails &&
        path.extendedDetails.steamm_oracle_pyth_price_seed_b
      ) {
        priceIDs.add(path.extendedDetails.steamm_oracle_pyth_price_seed_b)
      }
    }
    if (path.provider === SEVENK) {
      // Support both camelCase (v2) and snake_case (v3) field names
      if (path.extendedDetails) {
        const extDetails = path.extendedDetails as any
        // Check snake_case fields (v3)
        if (extDetails.sevenk_coin_a_price_seed) {
          priceIDs.add(extDetails.sevenk_coin_a_price_seed)
        }
        if (extDetails.sevenk_coin_b_price_seed) {
          priceIDs.add(extDetails.sevenk_coin_b_price_seed)
        }
      }
    }
    if (path.provider === HAEDALHMMV2) {
      if (
        path.extendedDetails &&
        path.extendedDetails.haedalhmmv2_base_price_seed
      ) {
        priceIDs.add(path.extendedDetails.haedalhmmv2_base_price_seed)
      }
    }
  }
  return Array.from(priceIDs)
}

export type AggregatorClientParams = {
  endpoint?: string
  signer?: string
  client?: SuiJsonRpcClient
  env?: Env
  pythUrls?: string[]
  apiKey?: string
  partner?: string
  overlayFeeRate?: number
  overlayFeeReceiver?: string
  cetusDlmmPartner?: string
}

interface PythConfig {
  wormholeStateId: string
  pythStateId: string
}

export class AggregatorClient {
  public endpoint: string
  public signer: string
  public client: SuiJsonRpcClient
  public env: Env
  public apiKey: string

  protected pythAdapter: PythAdapter
  protected overlayFeeRate: number
  protected overlayFeeReceiver: string
  protected partner?: string
  protected cetusDlmmPartner?: string

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
    // Initialize the base client with v3 endpoint
    this.endpoint = params.endpoint
      ? processEndpoint(params.endpoint)
      : DEFAULT_ENDPOINT

    const network = params.env === Env.Testnet ? 'testnet' : 'mainnet'
    const rpcUrl = params.env === Env.Testnet
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.mainnet.sui.io:443'

    this.client =
      params.client ?? new SuiJsonRpcClient({ network, url: rpcUrl })
    this.signer = params.signer || ""
    this.env = params.env || Env.Mainnet

    const config = AggregatorClient.CONFIG[this.env]
    this.pythAdapter = new PythAdapter(
      this.client,
      config.pythStateId,
      config.wormholeStateId,
      params.pythUrls ?? [],
    )
    this.apiKey = params.apiKey || ""
    this.partner = params.partner
    this.cetusDlmmPartner = params.cetusDlmmPartner

    // Override overlay fee rate calculation for v3
    if (params.overlayFeeRate) {
      if (
        params.overlayFeeRate > 0 &&
        params.overlayFeeRate <= Constants.CLIENT_CONFIG.MAX_OVERLAY_FEE_RATE
      ) {
        // Convert to contract format (multiply by 1000000 as per REFACTOR.md)
        this.overlayFeeRate =
          params.overlayFeeRate * Constants.AGGREGATOR_V3_CONFIG.FEE_DENOMINATOR

        // Validate against contract's MAX_FEE_RATE
        if (this.overlayFeeRate > Constants.AGGREGATOR_V3_CONFIG.MAX_FEE_RATE) {
          throw new Error(
            Constants.CLIENT_CONFIG.ERRORS.INVALID_OVERLAY_FEE_RATE
          )
        }
      } else {
        throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_OVERLAY_FEE_RATE)
      }
    } else {
      this.overlayFeeRate = 0
    }
    this.overlayFeeReceiver =
      params.overlayFeeReceiver ??
      Constants.CLIENT_CONFIG.DEFAULT_OVERLAY_FEE_RECEIVER
  }

  deepbookv3DeepFeeType(): string {
    if (this.env === Env.Mainnet) {
      return Constants.DEEPBOOK_V3_DEEP_FEE_TYPES.Mainnet
    } else {
      return Constants.DEEPBOOK_V3_DEEP_FEE_TYPES.Testnet
    }
  }

  async getDeepbookV3Config(): Promise<DeepbookV3ConfigResponse | null> {
    return await getDeepbookV3Config(this.endpoint)
  }

  async getOneCoinUsedToMerge(coinType: string): Promise<string | null> {
    try {
      const gotCoin = await this.client.getCoins({
        owner: this.signer,
        coinType,
        limit: 1,
      })
      if (gotCoin.data.length === 1) {
        return gotCoin.data[0].coinObjectId
      }
      return null
    } catch (error) {
      return null
    }
  }

  async findRouters(params: FindRouterParams): Promise<RouterDataV3 | null> {
    return getRouterResult(
      this.endpoint,
      this.apiKey,
      params,
      this.overlayFeeRate,
      this.overlayFeeReceiver
    )
  }

  async findMergeSwapRouters(
    params: MergeSwapParams
  ): Promise<MergeSwapRouterData | null> {
    return getMergeSwapResult(
      this.endpoint,
      this.apiKey,
      params,
      this.overlayFeeRate,
      this.overlayFeeReceiver
    )
  }

  async executeFlexibleInputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routerData: RouterDataV3,
    expectedAmountOut: string,
    amountLimit: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    deepbookv3DeepFee?: TransactionObjectArgument,
    packages?: Map<string, string>
  ) {}

  newDexRouterV3(
    provider: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    cetusDlmmPartner?: string
  ): DexRouter {
    switch (provider) {
      case CETUS:
        return new CetusRouter(this.env, partner)
      case KRIYAV3:
        return new KriyaV3Router(this.env)
      case FLOWXV3:
        return new FlowxV3Router(this.env)
      case TURBOS:
        return new TurbosRouter(this.env)
      case BLUEFIN:
        return new BluefinRouter(this.env)
      case MOMENTUM:
        return new MomentumRouter(this.env)
      case MAGMA:
        return new MagmaRouter(this.env)
      case KRIYA:
        return new KriyaV2Router(this.env)
      case FLOWXV2:
        return new FlowxV2Router(this.env)
      case BLUEMOVE:
        return new BluemoveRouter(this.env)
      case DEEPBOOKV3:
        return new DeepbookV3Router(this.env)
      case AFTERMATH:
        return new AftermathRouter(this.env)
      case STEAMM:
        return new SteammCPMMRouter(this.env)
      case SCALLOP:
        return new ScallopRouter(this.env)
      case SUILEND:
        return new SpringsuiRouter(this.env)
      case SPRINGSUI:
        return new SpringsuiRouter(this.env)
      case HAEDALPMM:
        return new HaedalPmmRouter(this.env, pythPriceIDs)
      case OBRIC:
        return new ObricRouter(this.env, pythPriceIDs)
      case SEVENK:
        return new SevenkRouter(this.env, pythPriceIDs)
      case STEAMM_OMM:
        return new SteammOmmRouter(this.env, pythPriceIDs)
      case STEAMM_OMM_V2:
        return new SteammOmmV2Router(this.env, pythPriceIDs)
      case METASTABLE:
        return new MetastableRouter(this.env, pythPriceIDs)
      case ALPHAFI:
        return new AlphafiRouter(this.env)
      case VOLO:
        return new VoloRouter(this.env)
      case AFSUI:
        return new AfsuiRouter(this.env)
      case HAEDAL:
        return new HaedalRouter(this.env)
      case HAWAL:
        return new HawalRouter(this.env)
      case HAEDALHMMV2:
        return new HaedalHMMV2Router(this.env, pythPriceIDs)
      case FULLSAIL:
        return new FullsailRouter(this.env)
      case CETUSDLMM:
        return new CetusDlmmRouter(this.env, cetusDlmmPartner)
      case FERRADLMM:
        return new FerraDlmmRouter(this.env)
      case FERRACLMM:
        return new FerraClmmRouter(this.env)
      case BOLT:
        return new BoltRouter(this.env)
      default:
        throw new Error(
          `${Constants.CLIENT_CONFIG.ERRORS.UNSUPPORTED_DEX} ${provider}`
        )
    }
  }

  expectInputSwapV3(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routerData: RouterDataV3,
    expectAmountOut: string,
    amountOutLimit: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    cetusDlmmPartner?: string
  ): TransactionObjectArgument {
    if (routerData.quoteID == null) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.QUOTE_ID_REQUIRED)
    }
    // Step 1: Flatten and sort routes for V3 execution
    const processedData = processFlattenRoutes(routerData)

    const swapCtx = newSwapContext(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        expectAmountOut,
        amountOutLimit,
        inputCoin,
        feeRate: this.overlayFeeRate,
        feeRecipient: this.overlayFeeReceiver,
        packages: processedData.packages,
      },
      txb
    )

    // Step 2: Execute swaps in flattened order using V3 routers only
    let dexRouters = new Map<string, DexRouter>()
    for (const flattenedPath of processedData.flattenedPaths) {
      const path = flattenedPath.path
      if (!dexRouters.has(path.provider)) {
        dexRouters.set(
          path.provider,
          this.newDexRouterV3(
            path.provider,
            pythPriceIDs,
            partner,
            cetusDlmmPartner
          )
        )
      }
      const dex = dexRouters.get(path.provider)!
      dex.swap(txb, flattenedPath, swapCtx, { pythPriceIDs })
    }

    const outputCoin = confirmSwap(
      {
        swapContext: swapCtx,
        targetCoinType: processedData.targetCoinType,
        packages: processedData.packages,
      },
      txb
    )

    return outputCoin
  }

  expectInputSwapV3WithMaxAmountIn(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routerData: RouterDataV3,
    maxAmountIn: BN,
    expectAmountOut: string,
    amountOutLimit: string,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    cetusDlmmPartner?: string
  ): TransactionObjectArgument {
    if (routerData.quoteID == null) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.QUOTE_ID_REQUIRED)
    }
    // Step 1: Flatten and sort routes for V3 execution
    const processedData = processFlattenRoutes(routerData)

    const swapCtx = newSwapContextV2(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn,
        expectAmountOut,
        amountOutLimit,
        inputCoin,
        feeRate: this.overlayFeeRate,
        feeRecipient: this.overlayFeeReceiver,
        packages: processedData.packages,
      },
      txb
    )

    // Step 2: Execute swaps in flattened order using V3 routers only
    let dexRouters = new Map<string, DexRouter>()
    for (const flattenedPath of processedData.flattenedPaths) {
      const path = flattenedPath.path
      if (!dexRouters.has(path.provider)) {
        dexRouters.set(
          path.provider,
          this.newDexRouterV3(
            path.provider,
            pythPriceIDs,
            partner,
            cetusDlmmPartner
          )
        )
      }
      const dex = dexRouters.get(path.provider)!
      dex.swap(txb, flattenedPath, swapCtx, { pythPriceIDs })
    }

    const outputCoin = confirmSwap(
      {
        swapContext: swapCtx,
        targetCoinType: processedData.targetCoinType,
        packages: processedData.packages,
      },
      txb
    )

    return outputCoin
  }

  expectOutputSwapV3(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routerData: RouterDataV3,
    amountOut: string,
    _amountLimit: string, // it will set when build inputcoin
    partner?: string
  ): TransactionObjectArgument {
    const receipts: TransactionObjectArgument[] = []
    const dex = new CetusRouter(this.env, partner)
    const processedData = processFlattenRoutes(routerData)
    const swapCtx = newSwapContext(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        expectAmountOut: amountOut,
        amountOutLimit: amountOut, // amountOutLimit equals expectAmountOut when fix amout out
        inputCoin,
        feeRate: this.overlayFeeRate,
        feeRecipient: this.overlayFeeReceiver,
        packages: processedData.packages,
      },
      txb
    )

    // Record all from token first exist index
    // key: from token, value: path index
    const firstCoinRecord = recordFirstCoinIndex(routerData.paths)

    let needRepayRecord = new Map<string, TransactionArgument>()
    let payRecord = new Map<string, bigint>()

    for (let j = routerData.paths.length - 1; j >= 0; j--) {
      const path = routerData.paths[j]
      const firstFromTokenIndex = firstCoinRecord.get(path.from)
      let amountArg: TransactionArgument
      if (
        j !== firstFromTokenIndex ||
        path.target === processedData.targetCoinType
      ) {
        if (path.target !== processedData.targetCoinType) {
          let payAmount = BigInt(path.amountOut)
          if (payRecord.has(path.target)) {
            const oldPayAmount = payRecord.get(path.target)!
            payAmount = oldPayAmount + payAmount
          }
          payRecord.set(path.target, payAmount)
        }

        amountArg = txb.pure.u64(
          path.amountOut.toString()
        ) as TransactionArgument
      } else {
        if (!needRepayRecord.has(path.target)) {
          throw Error("no need repay record")
        }

        if (payRecord.has(path.target)) {
          // total need repay - payRecord
          const oldPayAmount = payRecord.get(path.target)!
          const oldNeedRepay = needRepayRecord.get(path.target)!
          amountArg = dex.sub(
            txb,
            oldNeedRepay,
            txb.pure.u64(oldPayAmount),
            path.publishedAt!
          )
        } else {
          // total need repay
          amountArg = needRepayRecord.get(path.target)!
        }
      }

      const flashSwapResult = dex.flashSwapFixedOutput(
        txb,
        path,
        amountArg,
        swapCtx
      )
      receipts.unshift(flashSwapResult.flashReceipt)
      if (needRepayRecord.has(path.from)) {
        const oldNeedRepay = needRepayRecord.get(path.from)!
        needRepayRecord.set(
          path.from,
          dex.add(
            txb,
            oldNeedRepay,
            flashSwapResult.repayAmount,
            path.publishedAt!
          )
        )
      } else {
        needRepayRecord.set(path.from, flashSwapResult.repayAmount)
      }
    }

    for (let j = 0; j < routerData.paths.length; j++) {
      const path = routerData.paths[j]
      dex.repayFlashSwapFixedOutput(txb, path, swapCtx, receipts[j])
    }

    const remainInputBalance = takeBalance(
      {
        coinType: processedData.fromCoinType,
        amount: Constants.U64_MAX,
        swapCtx,
        packages: processedData.packages,
      },
      txb
    )

    transferBalance(
      {
        balance: remainInputBalance,
        coinType: processedData.fromCoinType,
        recipient: this.signer,
        packages: processedData.packages,
      },
      txb
    )

    const outputCoin = confirmSwap(
      {
        swapContext: swapCtx,
        targetCoinType: processedData.targetCoinType,
        packages: processedData.packages,
      },
      txb
    )

    return outputCoin
  }

  expectOutputSwapV3WithMaxAmountIn(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routerData: RouterDataV3,
    maxAmountIn: BN,
    amountOut: string,
    _amountLimit: string, // it will set when build inputcoin
    partner?: string
  ): TransactionObjectArgument {
    const receipts: TransactionObjectArgument[] = []
    const dex = new CetusRouter(this.env, partner)
    const processedData = processFlattenRoutes(routerData)
    const swapCtx = newSwapContextV2(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn,
        expectAmountOut: amountOut,
        amountOutLimit: amountOut, // amountOutLimit equals expectAmountOut when fix amout out
        inputCoin,
        feeRate: this.overlayFeeRate,
        feeRecipient: this.overlayFeeReceiver,
        packages: processedData.packages,
      },
      txb
    )

    // Record all from token first exist index
    // key: from token, value: path index
    const firstCoinRecord = recordFirstCoinIndex(routerData.paths)

    let needRepayRecord = new Map<string, TransactionArgument>()
    let payRecord = new Map<string, bigint>()

    for (let j = routerData.paths.length - 1; j >= 0; j--) {
      const path = routerData.paths[j]
      const firstFromTokenIndex = firstCoinRecord.get(path.from)
      let amountArg: TransactionArgument
      if (
        j !== firstFromTokenIndex ||
        path.target === processedData.targetCoinType
      ) {
        if (path.target !== processedData.targetCoinType) {
          let payAmount = BigInt(path.amountOut)
          if (payRecord.has(path.target)) {
            const oldPayAmount = payRecord.get(path.target)!
            payAmount = oldPayAmount + payAmount
          }
          payRecord.set(path.target, payAmount)
        }

        amountArg = txb.pure.u64(
          path.amountOut.toString()
        ) as TransactionArgument
      } else {
        if (!needRepayRecord.has(path.target)) {
          throw Error("no need repay record")
        }

        if (payRecord.has(path.target)) {
          // total need repay - payRecord
          const oldPayAmount = payRecord.get(path.target)!
          const oldNeedRepay = needRepayRecord.get(path.target)!
          amountArg = dex.sub(
            txb,
            oldNeedRepay,
            txb.pure.u64(oldPayAmount),
            path.publishedAt!
          )
        } else {
          // total need repay
          amountArg = needRepayRecord.get(path.target)!
        }
      }

      const flashSwapResult = dex.flashSwapFixedOutput(
        txb,
        path,
        amountArg,
        swapCtx
      )
      receipts.unshift(flashSwapResult.flashReceipt)
      if (needRepayRecord.has(path.from)) {
        const oldNeedRepay = needRepayRecord.get(path.from)!
        needRepayRecord.set(
          path.from,
          dex.add(
            txb,
            oldNeedRepay,
            flashSwapResult.repayAmount,
            path.publishedAt!
          )
        )
      } else {
        needRepayRecord.set(path.from, flashSwapResult.repayAmount)
      }
    }

    for (let j = 0; j < routerData.paths.length; j++) {
      const path = routerData.paths[j]
      dex.repayFlashSwapFixedOutput(txb, path, swapCtx, receipts[j])
    }

    const remainInputBalance = takeBalance(
      {
        coinType: processedData.fromCoinType,
        amount: Constants.U64_MAX,
        swapCtx,
        packages: processedData.packages,
      },
      txb
    )

    transferBalance(
      {
        balance: remainInputBalance,
        coinType: processedData.fromCoinType,
        recipient: this.signer,
        packages: processedData.packages,
      },
      txb
    )

    const outputCoin = confirmSwap(
      {
        swapContext: swapCtx,
        targetCoinType: processedData.targetCoinType,
        packages: processedData.packages,
      },
      txb
    )

    return outputCoin
  }

  async routerSwap(
    params: BuildRouterSwapParamsV3
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoin, slippage, txb, partner, cetusDlmmPartner } =
      params

    if (slippage > 1 || slippage < 0) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_SLIPPAGE)
    }

    if (
      !params.router.packages ||
      !params.router.packages.get(Constants.PACKAGE_NAMES.AGGREGATOR_V3)
    ) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.PACKAGES_REQUIRED)
    }

    const byAmountIn = params.router.byAmountIn
    const amountIn = router.amountIn
    const amountOut = router.amountOut

    checkOverlayFeeConfig(this.overlayFeeRate, this.overlayFeeReceiver)
    let overlayFee = new BN(0)
    if (byAmountIn) {
      overlayFee = amountOut
        .mul(new BN(this.overlayFeeRate))
        .div(new BN(1000000))
    } else {
      overlayFee = amountIn
        .mul(new BN(this.overlayFeeRate))
        .div(new BN(1000000))
    }

    const expectedAmountOut = byAmountIn ? amountOut.sub(overlayFee) : amountOut
    const expectedAmountIn = byAmountIn ? amountIn : amountIn.add(overlayFee)

    const amountLimit = CalculateAmountLimitBN(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )

    const priceIDs = findPythPriceIDs(router.paths)
    const priceInfoObjectIds =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    if (byAmountIn) {
      return this.expectInputSwapV3(
        txb,
        inputCoin,
        router,
        amountOut.toString(),
        amountLimit.toString(),
        priceInfoObjectIds,
        partner ?? this.partner,
        cetusDlmmPartner ?? this.cetusDlmmPartner
      )
    } else {
      return this.expectOutputSwapV3(
        txb,
        inputCoin,
        router,
        amountOut.toString(),
        amountLimit.toString(),
        partner ?? this.partner
      )
    }
  }

  /**
   * Router swap with max amount in validation.
   * This method validates that the input coin amount does not exceed maxAmountIn.
   * If the validation fails, the transaction will abort with an error.
   *
   * @param params - Router swap parameters with maxAmountIn
   * @returns TransactionObjectArgument - The output coin from the swap
   * @throws Error if input coin amount exceeds maxAmountIn
   */
  async routerSwapWithMaxAmountIn(
    params: BuildRouterSwapParamsV3 & { maxAmountIn: BN }
  ): Promise<TransactionObjectArgument> {
    const {
      router,
      inputCoin,
      slippage,
      txb,
      partner,
      cetusDlmmPartner,
      maxAmountIn,
    } = params

    if (slippage > 1 || slippage < 0) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_SLIPPAGE)
    }

    if (
      !params.router.packages ||
      !params.router.packages.get(Constants.PACKAGE_NAMES.AGGREGATOR_V3)
    ) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.PACKAGES_REQUIRED)
    }

    const byAmountIn = params.router.byAmountIn
    const amountIn = router.amountIn
    const amountOut = router.amountOut

    checkOverlayFeeConfig(this.overlayFeeRate, this.overlayFeeReceiver)
    let overlayFee = new BN(0)
    if (byAmountIn) {
      overlayFee = amountOut
        .mul(new BN(this.overlayFeeRate))
        .div(new BN(1000000))
    } else {
      overlayFee = amountIn
        .mul(new BN(this.overlayFeeRate))
        .div(new BN(1000000))
    }

    const expectedAmountOut = byAmountIn ? amountOut.sub(overlayFee) : amountOut
    const expectedAmountIn = byAmountIn ? amountIn : amountIn.add(overlayFee)

    const amountLimit = CalculateAmountLimitBN(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )

    const priceIDs = findPythPriceIDs(router.paths)
    const priceInfoObjectIds =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    if (byAmountIn) {
      return this.expectInputSwapV3WithMaxAmountIn(
        txb,
        inputCoin,
        router,
        maxAmountIn,
        amountOut.toString(),
        amountLimit.toString(),
        priceInfoObjectIds,
        partner ?? this.partner,
        cetusDlmmPartner ?? this.cetusDlmmPartner
      )
    } else {
      // For fixed output swaps, we still use the v2 context with max amount validation
      return this.expectOutputSwapV3WithMaxAmountIn(
        txb,
        inputCoin,
        router,
        maxAmountIn,
        amountOut.toString(),
        amountLimit.toString(),
        partner ?? this.partner
      )
    }
  }

  // auto build input coin
  // auto merge, transfer or destory target coin.
  async fastRouterSwap(params: BuildFastRouterSwapParamsV3) {
    const {
      router,
      slippage,
      txb,
      partner,
      cetusDlmmPartner,
      payDeepFeeAmount,
    } = params

    const fromCoinType = router.paths[0].from
    const targetCoinType = router.paths[router.paths.length - 1].target
    const byAmountIn = router.byAmountIn

    checkOverlayFeeConfig(this.overlayFeeRate, this.overlayFeeReceiver)
    let overlayFee = 0
    if (byAmountIn) {
      overlayFee = Number(
        router.amountOut
          .mul(new BN(this.overlayFeeRate))
          .div(new BN(1000000))
          .toString()
      )
    } else {
      overlayFee = Number(
        router.amountIn
          .mul(new BN(this.overlayFeeRate))
          .div(new BN(1000000))
          .toString()
      )
    }

    const expectedAmountOut = byAmountIn
      ? router.amountOut.sub(new BN(overlayFee))
      : router.amountOut
    const expectedAmountIn = byAmountIn
      ? router.amountIn
      : router.amountIn.add(new BN(overlayFee))

    const amountLimit = CalculateAmountLimit(
      byAmountIn ? expectedAmountOut : expectedAmountIn,
      byAmountIn,
      slippage
    )

    const amount = byAmountIn ? expectedAmountIn : amountLimit

    let inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: fromCoinType,
    })

    let deepCoin
    if (payDeepFeeAmount && payDeepFeeAmount > 0) {
      deepCoin = coinWithBalance({
        balance: BigInt(payDeepFeeAmount),
        type: this.deepbookv3DeepFeeType(),
      })
    }

    const routerSwapParams: BuildRouterSwapParamsV3 = {
      router,
      inputCoin,
      slippage,
      txb,
      partner: partner ?? this.partner,
      cetusDlmmPartner: cetusDlmmPartner ?? this.cetusDlmmPartner,
      deepbookv3DeepFee: deepCoin,
    }

    const targetCoin = await this.routerSwap(routerSwapParams)

    if (CoinUtils.isSuiCoin(targetCoinType)) {
      txb.mergeCoins(txb.gas, [targetCoin])
    } else {
      const targetCoinObjID = await this.getOneCoinUsedToMerge(targetCoinType)
      if (targetCoinObjID != null) {
        txb.mergeCoins(txb.object(targetCoinObjID), [targetCoin])
      } else {
        transferOrDestroyCoin(
          {
            coin: targetCoin,
            coinType: targetCoinType,
            packages: router.packages,
          },
          txb
        )
      }
    }
  }

  async mergeSwap(
    params: BuildMergeSwapParams
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoins, slippage, txb, partner } = params

    if (slippage > 1 || slippage < 0) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_SLIPPAGE)
    }

    if (
      !router.packages ||
      !router.packages.get(Constants.PACKAGE_NAMES.AGGREGATOR_V3)
    ) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.PACKAGES_REQUIRED)
    }

    if (!router.allRoutes || router.allRoutes.length === 0) {
      throw new Error("No routes found in merge swap response")
    }

    const outputCoins: TransactionObjectArgument[] = []

    // Execute each route from all_routes with its corresponding input coin
    for (let i = 0; i < router.allRoutes.length && i < inputCoins.length; i++) {
      const route = router.allRoutes[i]
      const inputCoin = inputCoins[i]

      // Create a RouterDataV3 for this specific route
      const routeRouter: RouterDataV3 = {
        quoteID: router.quoteID,
        amountIn: route.amountIn,
        amountOut: route.amountOut,
        deviationRatio: Number(route.deviationRatio),
        byAmountIn: true, // Merge swap is always by amount in
        paths: route.paths,
        insufficientLiquidity: false,
        packages: router.packages,
      }

      // Execute swap for this route with its own swap context
      const routerParams: BuildRouterSwapParamsV3 = {
        router: routeRouter,
        inputCoin: inputCoin.coin,
        slippage,
        txb,
        partner: partner ?? this.partner,
      }

      const outputCoin = await this.routerSwap(routerParams)
      outputCoins.push(outputCoin)
    }

    // Merge all output coins into a single coin
    if (outputCoins.length === 0) {
      throw new Error("No output coins generated from merge swap")
    }

    let finalOutputCoin = outputCoins[0]
    if (outputCoins.length > 1) {
      txb.mergeCoins(finalOutputCoin, outputCoins.slice(1))
    }

    return finalOutputCoin
  }

  async fastMergeSwap(params: BuildFastMergeSwapParams) {
    const { router, slippage, txb, partner } = params

    // Validate router
    if (!router || !router.allRoutes || router.allRoutes.length === 0) {
      throw new Error("Invalid router: no routes found")
    }

    // Get target coin type from the last path of the first route
    const firstRoute = router.allRoutes[0]
    const targetCoinType = firstRoute.paths[firstRoute.paths.length - 1].target

    // Build input coins automatically based on each route's first coin type
    const inputCoins: MergeSwapInputCoin[] = []
    const coinTypeSet = new Set<string>()

    for (const route of router.allRoutes) {
      // Get the first coin type from this route
      const firstCoinType = route.paths[0].from

      // Skip if we've already created a coin for this type
      if (coinTypeSet.has(firstCoinType)) {
        continue
      }

      coinTypeSet.add(firstCoinType)

      const coin = coinWithBalance({
        balance: BigInt(route.amountIn.toString()),
        useGasCoin: CoinUtils.isSuiCoin(firstCoinType),
        type: firstCoinType,
      })
      inputCoins.push({ coinType: firstCoinType, coin })
    }

    // Execute merge swap
    const mergeSwapParams: BuildMergeSwapParams = {
      router,
      inputCoins,
      slippage,
      txb,
      partner: partner ?? this.partner,
    }

    const targetCoin = await this.mergeSwap(mergeSwapParams)

    // Auto merge, transfer or destroy target coin
    if (CoinUtils.isSuiCoin(targetCoinType)) {
      txb.mergeCoins(txb.gas, [targetCoin])
    } else {
      const targetCoinObjID = await this.getOneCoinUsedToMerge(targetCoinType)
      if (targetCoinObjID != null) {
        txb.mergeCoins(txb.object(targetCoinObjID), [targetCoin])
      } else {
        transferOrDestroyCoin(
          {
            coin: targetCoin,
            coinType: targetCoinType,
            packages: router.packages,
          },
          txb
        )
      }
    }
  }

  async fixableRouterSwapV3(
    params: BuildRouterSwapParamsV3
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoin, slippage, txb, partner, cetusDlmmPartner } =
      params

    checkOverlayFeeConfig(this.overlayFeeRate, this.overlayFeeReceiver)
    let overlayFee = 0
    if (router.byAmountIn) {
      overlayFee = Number(
        router.amountOut
          .mul(new BN(this.overlayFeeRate))
          .div(new BN(1000000))
          .toString()
      )
    } else {
      overlayFee = Number(
        router.amountIn
          .mul(new BN(this.overlayFeeRate))
          .div(new BN(1000000))
          .toString()
      )
    }

    const expectedAmountOut = router.byAmountIn
      ? router.amountOut.sub(new BN(overlayFee))
      : router.amountOut
    const expectedAmountIn = router.byAmountIn
      ? router.amountIn
      : router.amountIn.add(new BN(overlayFee))

    const amountLimit = CalculateAmountLimitBN(
      router.byAmountIn ? expectedAmountOut : expectedAmountIn,
      router.byAmountIn,
      slippage
    )

    const priceIDs = findPythPriceIDs(router.paths)

    const priceInfoObjectIds =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    if (router.byAmountIn) {
      return this.expectInputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountOut.toString(),
        amountLimit.toString(),
        priceInfoObjectIds,
        partner ?? this.partner,
        cetusDlmmPartner ?? this.cetusDlmmPartner
      )
    } else {
      return this.expectOutputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountOut.toString(),
        amountLimit.toString(),
        partner ?? this.partner
      )
    }
  }

  async swapInPools(params: SwapInPoolsParams): Promise<SwapInPoolsResultV3> {
    const { from, target, amount, byAmountIn, pools } = params
    const fromCoin = completionCoin(from)
    const targetCoin = completionCoin(target)

    const tx = new Transaction()
    const direction = compareCoins(fromCoin, targetCoin)
    const coinA = direction ? fromCoin : targetCoin
    const coinB = direction ? targetCoin : fromCoin

    const typeArguments = [coinA, coinB]

    // Use the Cetus V3 published-at constant
    const integratePublishedAt =
      this.env === Env.Mainnet
        ? "0xfbb32ac0fa89a3cb0c56c745b688c6d2a53ac8e43447119ad822763997ffb9c3"
        : "0xab2d58dd28ff0dc19b18ab2c634397b785a38c342a8f5065ade5f53f9dbffa1c"

    for (let i = 0; i < pools.length; i++) {
      const args = [
        tx.object(pools[i]),
        tx.pure.bool(direction),
        tx.pure.bool(byAmountIn),
        tx.pure.u64(amount.toString()),
      ]
      tx.moveCall({
        target: `${integratePublishedAt}::fetcher_script::calculate_swap_result`,
        arguments: args,
        typeArguments,
      })
    }

    tx.setSenderIfNotSet(this.signer || "0x0")

    const simulateRes = await this.client.devInspectTransactionBlock({
      sender: this.signer || "0x0",
      transactionBlock: tx,
    })

    if (simulateRes.error) {
      throw new Error("Simulation error: " + simulateRes.error)
    }

    const events = simulateRes.events ?? []
    const valueData = events.filter((item) => {
      return item.type.includes("CalculatedSwapResultEvent")
    })

    if (valueData.length === 0 || valueData.length !== pools.length) {
      throw new Error("Simulate event result error")
    }

    let tempMaxAmount = byAmountIn ? new BN(0) : new BN(Constants.U64_MAX)
    let tempIndex = 0
    for (let i = 0; i < valueData.length; i += 1) {
      const eventJson = valueData[i].parsedJson as Record<string, any> | null
      if (eventJson?.data?.is_exceed) {
        continue
      }

      if (params.byAmountIn) {
        const amount = new BN(eventJson?.data?.amount_out ?? 0)
        if (amount.gt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      } else {
        const amount = new BN(eventJson?.data?.amount_out ?? 0)
        if (amount.lt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      }
    }

    const eventJson = valueData[tempIndex].parsedJson as Record<string, any> | null
    const eventData = eventJson?.data

    const [decimalA, decimalB] = await Promise.all([
      this.client.getCoinMetadata({ coinType: coinA }).then(res => res?.decimals ?? null),
      this.client.getCoinMetadata({ coinType: coinB }).then(res => res?.decimals ?? null),
    ])

    if (decimalA == null || decimalB == null) {
      throw new Error("Cannot get coin decimals")
    }

    const feeRate = Number(eventData?.fee_rate ?? 0) / 1000000
    const pureAmountIn = new BN(eventData?.amount_in ?? 0)
    const feeAmount = new BN(eventData?.fee_amount ?? 0)
    const amountIn = pureAmountIn.add(feeAmount)

    const cetusRouterV3PublishedAt =
      this.env === Env.Mainnet
        ? Constants.MAINNET_CETUS_V3_PUBLISHED_AT
        : Constants.TESTNET_CETUS_V3_PUBLISHED_AT
    const aggregatorV3PublishedAt =
      this.env === Env.Mainnet
        ? Constants.AGGREGATOR_V3_CONFIG.DEFAULT_PUBLISHED_AT.Mainnet
        : Constants.AGGREGATOR_V3_CONFIG.DEFAULT_PUBLISHED_AT.Testnet
      
    // Return RouterData in v3 format
    const routeData: RouterDataV3 = {
      amountIn: amountIn,
      amountOut: new BN(eventData?.amount_out ?? 0),
      deviationRatio: 0,
      paths: [
        {
          id: pools[tempIndex],
          direction,
          provider: CETUS,
          from: fromCoin,
          target: targetCoin,
          feeRate,
          amountIn: amountIn.toString(),
          amountOut: eventData?.amount_out ?? "0",
          publishedAt: cetusRouterV3PublishedAt,
          extendedDetails: {
            afterSqrtPrice: eventData?.after_sqrt_price,
          },
        },
      ],
      insufficientLiquidity: false,
      byAmountIn: params.byAmountIn,
      quoteID: `degraded-${generateUUID()}`,
      packages: new Map([
        [
          Constants.PACKAGE_NAMES.AGGREGATOR_V3,
          aggregatorV3PublishedAt,
        ],
      ]),
    }

    const result: SwapInPoolsResultV3 = {
      isExceed: eventData?.is_exceed ?? false,
      routeData,
    }

    return result
  }

  async updatePythPriceIDs(
    priceIDs: string[],
    txb: Transaction
  ): Promise<Map<string, string>> {
    const priceUpdateData = await this.pythAdapter.getPriceFeedsUpdateData(priceIDs)

    let priceInfoObjectIds: string[]
    try {
      priceInfoObjectIds = await this.pythAdapter.updatePriceFeeds(
        txb,
        priceUpdateData,
        priceIDs
      )
    } catch (e) {
      throw new Error(
        `Failed to update Pyth price feeds. Ensure pythUrls are configured correctly. Detailed error: ${e}`
      )
    }

    const priceInfoObjectIdsMap = new Map<string, string>()
    for (let i = 0; i < priceIDs.length; i++) {
      priceInfoObjectIdsMap.set(priceIDs[i], priceInfoObjectIds[i])
    }
    return priceInfoObjectIdsMap
  }

  async devInspectTransactionBlock(txb: Transaction) {
    txb.setSenderIfNotSet(this.signer || "0x0")
    const res = await this.client.devInspectTransactionBlock({
      sender: this.signer || "0x0",
      transactionBlock: txb,
    })
    return res
  }

  async sendTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
      options: { showEffects: true, showEvents: true, showBalanceChanges: true },
    })
    return res
  }
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function recordFirstCoinIndex(paths: Path[]): Map<string, number> {
  let newCoinRecord = new Map<string, number>()
  for (let i = 0; i < paths.length; i++) {
    if (!newCoinRecord.has(paths[i].from)) {
      newCoinRecord.set(paths[i].from, i)
    }
  }
  return newCoinRecord
}

function checkOverlayFeeConfig(
  overlayFeeRate: number,
  overlayFeeReceiver: string
) {
  if (overlayFeeRate > Constants.CLIENT_CONFIG.MAX_OVERLAY_FEE_RATE_NUMERATOR) {
    throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_OVERLAY_FEE_RATE)
  }
  if (overlayFeeReceiver === "0x0" && overlayFeeRate > 0) {
    throw new Error(
      Constants.CLIENT_CONFIG.ERRORS.OVERLAY_FEE_RECEIVER_REQUIRED
    )
  }
}
