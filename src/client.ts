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
  RebalanceRouterData,
} from "./types/shared"
import {
  getRouterResult,
  getRebalanceRouterResult,
  processFlattenRoutes,
  getMergeSwapResult,
  getDeepbookV3Config,
} from "./api"
import { Env } from "./config"
import {
  AggregatorError,
  TransactionErrorCode,
  parseAggregatorContractError,
} from "./errors"
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
  newSwapContextV3,
  confirmSwapV3,
  transferOrDestroyCoin,
  takeBalance,
  transferBalance,
} from "./movecall/router"
import { completionCoin, compareCoins } from "./utils/coin"
import { coinWithBalance } from "@mysten/sui/transactions"
import { SuiGrpcClient } from "@mysten/sui/grpc"
import { fromHex, SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import {
  PythAdapter,
  PythServiceProtocol,
  PythUrlEntry,
} from "./pyth/adapter"
import { processEndpoint } from "./utils"
import { Signer } from "@mysten/sui/cryptography"
import { HaedalHMMV2Router } from "./movecall/haedal_hmm_v2"
import { FullsailRouter } from "./movecall/fullsail"
import { CetusDlmmRouter } from "./movecall/cetus_dlmm"
import { FerraDlmmRouter } from "./movecall/ferra_dlmm"
import { FerraClmmRouter } from "./movecall/ferra_clmm"
import { BoltRouter } from "./movecall/bolt"
import { MagmaPropAmmRouter } from "./movecall/magmapropamm"
import { HaedalPropAmmRouter } from "./movecall/haedalpropamm"
import { CetusTideRouter } from "./movecall/cetus_tide"

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
export const MAGMAPROPAMM = "MAGMAPROPAMM"
export const HAEDALPROPAMM = "HAEDALPROPAMM"
export const CETUS_TIDE = "CETUS_TIDE"
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
  MAGMAPROPAMM,
  HAEDALPROPAMM,
  CETUS_TIDE,
]

export const PYTH_ORACLE_BASED_DEXES = [
  HAEDALPMM,
  METASTABLE,
  STEAMM_OMM_V2,
  HAEDALHMMV2,
  HAEDALPROPAMM,
]

// Providers that are automatically removed from routing when the caller
// declares a slippage at or below MAX_TIGHT_SLIPPAGE: their fills cannot
// reliably satisfy such a tight output limit, so routing through them would
// frequently abort on-chain with a slippage check failure.
export const TIGHT_SLIPPAGE_EXCLUDED_DEXES = [CETUS_TIDE]

// 0.1% — at or below this threshold TIGHT_SLIPPAGE_EXCLUDED_DEXES are
// filtered out.
export const MAX_TIGHT_SLIPPAGE = 0.001

function slippageToContractValue(slippage: number): number {
  if (!Number.isFinite(slippage) || slippage < 0 || slippage >= 1) {
    throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_SLIPPAGE)
  }
  return Math.floor(slippage * 1_000_000)
}

/**
 * When the caller declares a slippage at or below MAX_TIGHT_SLIPPAGE (0.1%),
 * removes TIGHT_SLIPPAGE_EXCLUDED_DEXES (currently CETUS_TIDE) from the
 * effective providers list, since those providers cannot reliably satisfy
 * such a tight output limit and would abort on-chain with a slippage check
 * failure. No-op when slippage is not provided or above the threshold.
 */
export function filterProvidersBySlippage<
  T extends { providers?: string[]; slippage?: number },
>(params: T): { params: T; providersExhausted: boolean } {
  const { slippage } = params
  if (slippage === undefined) {
    return { params, providersExhausted: false }
  }
  if (!Number.isFinite(slippage) || slippage < 0 || slippage >= 1) {
    throw new Error(Constants.CLIENT_CONFIG.ERRORS.INVALID_SLIPPAGE)
  }
  if (slippage > MAX_TIGHT_SLIPPAGE) {
    return { params, providersExhausted: false }
  }

  const sourceProviders =
    params.providers && params.providers.length > 0
      ? params.providers
      : ALL_DEXES
  const providers = sourceProviders.filter(
    provider =>
      !TIGHT_SLIPPAGE_EXCLUDED_DEXES.includes(provider.trim().toUpperCase())
  )

  return {
    params: { ...params, providers },
    providersExhausted: providers.length === 0,
  }
}

function decodeRebalanceHex(
  label: string,
  value: string,
  expectedLength?: number
): number[] {
  let bytes: number[]
  try {
    bytes = Array.from(fromHex(value))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`PQF rebalance: invalid ${label} hex: ${reason}`)
  }
  if (bytes.length === 0) {
    throw new Error(`PQF rebalance: ${label} must not be empty`)
  }
  if (expectedLength != null && bytes.length !== expectedLength) {
    throw new Error(
      `PQF rebalance: ${label} must be ${expectedLength} bytes, got ${bytes.length}`
    )
  }
  return bytes
}

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
  // When true, builds the swap for a sponsored transaction: never uses the gas coin
  // (which belongs to the sponsor). SUI input is taken from the sender's own coins and
  // SUI output is delivered to the sender instead of being merged into the gas coin.
  sponsored?: boolean
}

export type BuildRebalanceSwapParams = {
  router: RebalanceRouterData
  slippage: number
  txb: Transaction
  pqfPublishedAt: string
  versionedObjectId: string
  globalConfigObjectId: string
  marketMakerObjectId: string
  poolObjectId: string
  baseCoinType: string
  quoteCoinType: string
  partner?: string
  cetusDlmmPartner?: string
}

// Parameters for assembling a Sui sponsored transaction from a pre-built transaction
// kind. The sender (user) authors the commands while the sponsor pays the gas; both
// parties sign the same transaction bytes. See:
// https://docs.sui.io/concepts/transactions/sponsored-transactions
export type BuildSponsoredTransactionParams = {
  // TransactionKind bytes, e.g. from `buildTransactionKind()`.
  txKindBytes: Uint8Array | string
  // The user authoring the transaction commands.
  sender: string
  // The gas owner (sponsor / gas station) paying for gas.
  sponsor: string
  // Gas coins owned by the sponsor used to pay for gas.
  sponsorCoins: { objectId: string; version: string | number; digest: string }[]
  // Optional explicit gas budget; resolved at build time when omitted.
  gasBudget?: number | bigint | string
  // Optional explicit gas price; defaults to the network reference price when omitted.
  gasPrice?: number | bigint | string
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
    if (path.provider === HAEDALPROPAMM) {
      // Legacy Pyth core mode only; "pyth_core_v2" seeds go through the v2
      // adapter (findPythCoreV2PriceIDs).
      if (
        path.extendedDetails &&
        path.extendedDetails.haedalpropamm_oracle_mode === "pyth_core" &&
        path.extendedDetails.haedalpropamm_base_price_seed &&
        path.extendedDetails.haedalpropamm_quote_price_seed
      ) {
        priceIDs.add(path.extendedDetails.haedalpropamm_base_price_seed)
        priceIDs.add(path.extendedDetails.haedalpropamm_quote_price_seed)
      }
    }
  }
  return Array.from(priceIDs)
}

// Seeds needing PriceInfoObjects from the pro-compatible ("Pyth core v2")
// deployment. Only HAEDALPROPAMM pools whose oracle mode is "pyth_core_v2"
// use it; everything else stays on the legacy deployment above.
function findPythCoreV2PriceIDs(paths: Path[]): string[] {
  const priceIDs = new Set<string>()
  for (const path of paths) {
    if (path.provider === HAEDALPROPAMM) {
      if (
        path.extendedDetails &&
        path.extendedDetails.haedalpropamm_oracle_mode === "pyth_core_v2" &&
        path.extendedDetails.haedalpropamm_base_price_seed &&
        path.extendedDetails.haedalpropamm_quote_price_seed
      ) {
        priceIDs.add(path.extendedDetails.haedalpropamm_base_price_seed)
        priceIDs.add(path.extendedDetails.haedalpropamm_quote_price_seed)
      }
    }
  }
  return Array.from(priceIDs)
}

export type AggregatorClientParams = {
  endpoint?: string
  signer?: string
  client?: SuiGrpcClient
  env?: Env
  pythUrls?: string[]
  apiKey?: string
  partner?: string
  overlayFeeRate?: number
  overlayFeeReceiver?: string
  cetusDlmmPartner?: string
  pythAvailabilityCheckInterval?: number
  // Overrides for the new Pyth core deployment (used only by HAEDALPROPAMM).
  // Defaults come from Constants.PYTH_CORE_V2_CONFIG. Teams with their own
  // registered Pyth api key can point pythUrls at their endpoint here; an
  // apiKey is bound to exactly the url it is declared with:
  //   pythUrls: [{ url: "https://my.endpoint", apiKey: "my-key" }]
  pythCoreV2?: {
    pythStateId?: string
    wormholeStateId?: string
    pythUrls?: Array<string | PythUrlEntry>
    protocol?: PythServiceProtocol
  }
}

interface PythConfig {
  wormholeStateId: string
  pythStateId: string
}

export class AggregatorClient {
  public endpoint: string
  public signer: string
  public client: SuiGrpcClient
  public env: Env
  public apiKey: string

  protected pythAdapter: PythAdapter
  // Adapter for the new Pyth core deployment; only HAEDALPROPAMM builds
  // against it. Everything else stays on `pythAdapter` (legacy deployment).
  protected pythAdapterV2: PythAdapter
  protected overlayFeeRate: number
  protected overlayFeeReceiver: string
  protected partner?: string
  protected cetusDlmmPartner?: string
  private pythAvailabilityCheckInterval?: number
  private pythAvailabilityCheckedAt?: number
  private pythAvailable?: boolean
  private pythAvailabilityPromise?: Promise<boolean>
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
    const grpcUrl = params.env === Env.Testnet
      ? 'https://fullnode.testnet.sui.io:443'
      : 'https://fullnode.mainnet.sui.io:443'

    this.client =
      params.client ?? new SuiGrpcClient({ network, baseUrl: grpcUrl })
    this.signer = params.signer || ""
    this.env = params.env || Env.Mainnet
    this.apiKey = params.apiKey || ""

    const config = AggregatorClient.CONFIG[this.env]
    this.pythAdapter = new PythAdapter(
      this.client,
      config.pythStateId,
      config.wormholeStateId,
      params.pythUrls ?? [Constants.CLIENT_CONFIG.DEFAULT_PYTH_URL]
    )
    const configV2 =
      Constants.PYTH_CORE_V2_CONFIG[
        this.env === Env.Testnet ? "Testnet" : "Mainnet"
      ]
    // Pro-compatible ("Pyth core v2") deployment adapter; only exercised for
    // HAEDALPROPAMM paths whose oracle mode is "pyth_core_v2". Defaults live
    // in Constants.PYTH_CORE_V2_CONFIG; the client's Cetus apiKey is bound
    // only to the default Cetus proxy urls, never to caller-provided ones
    // (each entry carries its own key).
    // No fallback url: cross-deployment update data aborts on-chain.
    this.pythAdapterV2 = new PythAdapter(
      this.client,
      params.pythCoreV2?.pythStateId ?? configV2.pythStateId,
      params.pythCoreV2?.wormholeStateId ?? configV2.wormholeStateId,
      params.pythCoreV2?.pythUrls ??
        configV2.pythUrls.map(url => ({ url, apiKey: this.apiKey })),
      {
        protocol: params.pythCoreV2?.protocol ?? configV2.protocol,
        fallbackUrl: null,
      }
    )
    this.partner = params.partner
    this.cetusDlmmPartner = params.cetusDlmmPartner
    this.pythAvailabilityCheckInterval =
      validatePythAvailabilityCheckInterval(
        params.pythAvailabilityCheckInterval
      )

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
      const gotCoin = await this.client.listCoins({
        owner: this.signer,
        coinType,
        limit: 1,
      })
      if (gotCoin.objects.length === 1) {
        return gotCoin.objects[0].objectId
      }
      return null
    } catch (error) {
      return null
    }
  }

  async findRouters(params: FindRouterParams): Promise<RouterDataV3 | null> {
    const slippageFiltered = filterProvidersBySlippage(params)
    if (slippageFiltered.providersExhausted) {
      return emptyRouterResult(slippageFiltered.params.byAmountIn)
    }

    const {
      params: routerParams,
      providersExhausted,
    } = await this.filterProvidersByPythAvailability(slippageFiltered.params)

    if (providersExhausted) {
      return emptyRouterResult(routerParams.byAmountIn)
    }

    return getRouterResult(
      this.endpoint,
      this.apiKey,
      routerParams,
      this.overlayFeeRate,
      this.overlayFeeReceiver
    )
  }

  async findRebalanceRouters(
    params: FindRouterParams
  ): Promise<RebalanceRouterData | null> {
    const {
      params: routerParams,
      providersExhausted,
    } = await this.filterProvidersByPythAvailability(params)

    if (providersExhausted) {
      return emptyRouterResult(routerParams.byAmountIn)
    }

    return getRebalanceRouterResult(
      this.endpoint,
      this.apiKey,
      routerParams
    )
  }

  async findMergeSwapRouters(
    params: MergeSwapParams
  ): Promise<MergeSwapRouterData | null> {
    const slippageFiltered = filterProvidersBySlippage(params)
    if (slippageFiltered.providersExhausted) {
      return emptyMergeSwapResult()
    }

    const {
      params: routerParams,
      providersExhausted,
    } = await this.filterProvidersByPythAvailability(slippageFiltered.params)

    if (providersExhausted) {
      return emptyMergeSwapResult()
    }

    return getMergeSwapResult(
      this.endpoint,
      this.apiKey,
      routerParams,
      this.overlayFeeRate,
      this.overlayFeeReceiver
    )
  }

  private async filterProvidersByPythAvailability<
    T extends {
      providers?: string[]
      pythAvailabilityCheckInterval?: number
    },
  >(params: T): Promise<{ params: T; providersExhausted: boolean }> {
    const interval = validatePythAvailabilityCheckInterval(
      params.pythAvailabilityCheckInterval ??
        this.pythAvailabilityCheckInterval
    )

    if (interval === undefined) {
      return { params, providersExhausted: false }
    }

    const pythAvailable = await this.getPythAvailability(interval)
    if (pythAvailable) {
      return { params, providersExhausted: false }
    }

    const sourceProviders =
      params.providers && params.providers.length > 0
        ? params.providers
        : ALL_DEXES
    const providers = sourceProviders.filter(
      provider => !PYTH_ORACLE_BASED_DEXES.includes(provider)
    )

    return {
      params: { ...params, providers },
      providersExhausted: providers.length === 0,
    }
  }

  private async getPythAvailability(interval: number): Promise<boolean> {
    const now = Date.now()
    if (
      this.pythAvailable !== undefined &&
      this.pythAvailabilityCheckedAt !== undefined &&
      now - this.pythAvailabilityCheckedAt < interval
    ) {
      return this.pythAvailable
    }

    if (this.pythAvailabilityPromise) {
      return this.pythAvailabilityPromise
    }

    this.pythAvailabilityPromise = this.pythAdapter
      .isHermesAvailable()
      .catch(() => false)
      .then(available => {
        this.pythAvailable = available
        this.pythAvailabilityCheckedAt = Date.now()
        return available
      })
      .finally(() => {
        this.pythAvailabilityPromise = undefined
      })

    return this.pythAvailabilityPromise
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
    cetusDlmmPartner?: string,
    // PriceInfoObjects from the new Pyth core deployment; consumed only by
    // HAEDALPROPAMM. Every other DEX keeps reading pythPriceIDs (legacy).
    pythCoreV2PriceIDs?: Map<string, string>
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
      case MAGMAPROPAMM:
        return new MagmaPropAmmRouter(this.env)
      case HAEDALPROPAMM:
        return new HaedalPropAmmRouter(
          this.env,
          pythPriceIDs,
          pythCoreV2PriceIDs ?? new Map()
        )
      case CETUS_TIDE:
        return new CetusTideRouter()
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
    quoteAmountIn: string,
    quoteAmountOut: string,
    slippage: number,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    cetusDlmmPartner?: string,
    pythCoreV2PriceIDs?: Map<string, string>
  ): TransactionObjectArgument {
    if (routerData.quoteID == null) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.QUOTE_ID_REQUIRED)
    }
    // Step 1: Flatten and sort routes for V3 execution
    const processedData = processFlattenRoutes(routerData)

    const swapCtx = newSwapContextV3(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn: Constants.U64_MAX,
        quoteAmountIn,
        quoteAmountOut,
        slippage: slippageToContractValue(slippage),
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
            cetusDlmmPartner,
            pythCoreV2PriceIDs
          )
        )
      }
      const dex = dexRouters.get(path.provider)!
      dex.swap(txb, flattenedPath, swapCtx, { pythPriceIDs })
    }

    const outputCoin = confirmSwapV3(
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
    quoteAmountIn: string,
    quoteAmountOut: string,
    slippage: number,
    pythPriceIDs: Map<string, string>,
    partner?: string,
    cetusDlmmPartner?: string,
    pythCoreV2PriceIDs?: Map<string, string>
  ): TransactionObjectArgument {
    if (routerData.quoteID == null) {
      throw new Error(Constants.CLIENT_CONFIG.ERRORS.QUOTE_ID_REQUIRED)
    }
    // Step 1: Flatten and sort routes for V3 execution
    const processedData = processFlattenRoutes(routerData)

    const swapCtx = newSwapContextV3(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn,
        quoteAmountIn,
        quoteAmountOut,
        slippage: slippageToContractValue(slippage),
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
            cetusDlmmPartner,
            pythCoreV2PriceIDs
          )
        )
      }
      const dex = dexRouters.get(path.provider)!
      dex.swap(txb, flattenedPath, swapCtx, { pythPriceIDs })
    }

    const outputCoin = confirmSwapV3(
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
    quoteAmountIn: string,
    quoteAmountOut: string,
    slippage: number,
    partner?: string
  ): TransactionObjectArgument {
    const receipts: TransactionObjectArgument[] = []
    const dex = new CetusRouter(this.env, partner)
    const processedData = processFlattenRoutes(routerData)
    const swapCtx = newSwapContextV3(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn: Constants.U64_MAX,
        quoteAmountIn,
        quoteAmountOut,
        slippage: slippageToContractValue(slippage),
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

    const outputCoin = confirmSwapV3(
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
    quoteAmountIn: string,
    quoteAmountOut: string,
    slippage: number,
    partner?: string
  ): TransactionObjectArgument {
    const receipts: TransactionObjectArgument[] = []
    const dex = new CetusRouter(this.env, partner)
    const processedData = processFlattenRoutes(routerData)
    const swapCtx = newSwapContextV3(
      {
        quoteID: processedData.quoteID,
        fromCoinType: processedData.fromCoinType,
        targetCoinType: processedData.targetCoinType,
        maxAmountIn,
        quoteAmountIn,
        quoteAmountOut,
        slippage: slippageToContractValue(slippage),
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

    const outputCoin = confirmSwapV3(
      {
        swapContext: swapCtx,
        targetCoinType: processedData.targetCoinType,
        packages: processedData.packages,
      },
      txb
    )

    return outputCoin
  }

  async rebalanceSwap(params: BuildRebalanceSwapParams): Promise<void> {
    const {
      router,
      slippage,
      txb,
      pqfPublishedAt,
      versionedObjectId,
      globalConfigObjectId,
      marketMakerObjectId,
      poolObjectId,
      baseCoinType,
      quoteCoinType,
      partner,
      cetusDlmmPartner,
    } = params

    slippageToContractValue(slippage)
    if (this.overlayFeeRate !== 0) {
      throw new Error("PQF rebalance does not support an aggregator overlay fee")
    }
    if (router.error) {
      throw new Error(`PQF rebalance route error: ${router.error.msg}`)
    }
    if (!router.byAmountIn) {
      throw new Error("PQF rebalance route only supports byAmountIn=true")
    }
    if (router.paths.length === 0) {
      throw new Error("PQF rebalance route has no paths")
    }
    if (
      !router.rebalanceQuoteBcs ||
      !router.rebalanceQuoteSignature ||
      !router.rebalanceQuote
    ) {
      throw new Error("PQF rebalance route is missing signed quote fields")
    }
    for (const [label, value] of Object.entries({
      pqfPublishedAt,
      versionedObjectId,
      globalConfigObjectId,
      marketMakerObjectId,
      poolObjectId,
      baseCoinType,
      quoteCoinType,
    })) {
      if (!value) {
        throw new Error(`PQF rebalance: ${label} is required`)
      }
    }

    const quote = router.rebalanceQuote
    if (!router.amountIn.eq(new BN(quote.amountIn))) {
      throw new Error(
        "PQF rebalance: route amountIn does not match the signed quote"
      )
    }
    if (!router.amountOut.eq(new BN(quote.amountOut))) {
      throw new Error(
        "PQF rebalance: route amountOut does not match the signed quote"
      )
    }

    const processed = processFlattenRoutes(router)
    const routeCoinIn = completionCoin(processed.fromCoinType)
    const routeCoinOut = completionCoin(processed.targetCoinType)
    const signedCoinIn = completionCoin(quote.coinIn)
    const signedCoinOut = completionCoin(quote.coinOut)
    if (routeCoinIn !== signedCoinIn || routeCoinOut !== signedCoinOut) {
      throw new Error(
        "PQF rebalance: route coin types do not match the signed quote"
      )
    }

    const base = completionCoin(baseCoinType)
    const quoteType = completionCoin(quoteCoinType)
    let baseToQuote: boolean
    if (signedCoinIn === base && signedCoinOut === quoteType) {
      baseToQuote = true
    } else if (signedCoinIn === quoteType && signedCoinOut === base) {
      baseToQuote = false
    } else {
      throw new Error(
        "PQF rebalance: signed quote coin types do not match the pool pair"
      )
    }

    const rebalanceQuoteBytes = decodeRebalanceHex(
      "rebalance_quote_bcs",
      router.rebalanceQuoteBcs
    )
    const rebalanceQuoteSignature = decodeRebalanceHex(
      "rebalance_quote_signature",
      router.rebalanceQuoteSignature,
      96
    )
    const beginFunction = baseToQuote
      ? "begin_rebalance_base_to_quote"
      : "begin_rebalance_quote_to_base"
    const finishFunction = baseToQuote
      ? "finish_rebalance_base_to_quote"
      : "finish_rebalance_quote_to_base"

    const [borrowedBalance, receipt] = txb.moveCall({
      target: `${pqfPublishedAt}::orderbook_v2::${beginFunction}`,
      typeArguments: [baseCoinType, quoteCoinType],
      arguments: [
        txb.object(versionedObjectId),
        txb.object(globalConfigObjectId),
        txb.object(marketMakerObjectId),
        txb.object(poolObjectId),
        txb.pure.u64(router.amountIn.toString()),
        txb.pure.vector("u8", rebalanceQuoteBytes),
        txb.pure.vector("u8", rebalanceQuoteSignature),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    const borrowedCoin = txb.moveCall({
      target: "0x2::coin::from_balance",
      typeArguments: [signedCoinIn],
      arguments: [borrowedBalance],
    }) as TransactionObjectArgument

    const repayCoin = await this.routerSwap({
      router,
      inputCoin: borrowedCoin,
      slippage,
      txb,
      partner: partner ?? this.partner,
      cetusDlmmPartner: cetusDlmmPartner ?? this.cetusDlmmPartner,
    })
    const repayBalance = txb.moveCall({
      target: "0x2::coin::into_balance",
      typeArguments: [signedCoinOut],
      arguments: [repayCoin],
    })

    txb.moveCall({
      target: `${pqfPublishedAt}::orderbook_v2::${finishFunction}`,
      typeArguments: [baseCoinType, quoteCoinType],
      arguments: [
        txb.object(versionedObjectId),
        txb.object(marketMakerObjectId),
        txb.object(poolObjectId),
        repayBalance,
        receipt,
      ],
    })
  }

  async routerSwap(
    params: BuildRouterSwapParamsV3
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoin, slippage, txb, partner, cetusDlmmPartner } = params

    slippageToContractValue(slippage)

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

    const { legacy: priceInfoObjectIds, coreV2: pythCoreV2PriceIDs } =
      await this.preparePythPriceInfoObjects(router.paths, txb)

    if (byAmountIn) {
      return this.expectInputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
        priceInfoObjectIds,
        partner ?? this.partner,
        cetusDlmmPartner ?? this.cetusDlmmPartner,
        pythCoreV2PriceIDs
      )
    } else {
      return this.expectOutputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
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
    const { router, inputCoin, slippage, txb, partner, maxAmountIn } = params

    slippageToContractValue(slippage)

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

    const { legacy: priceInfoObjectIds, coreV2: pythCoreV2PriceIDs } =
      await this.preparePythPriceInfoObjects(router.paths, txb)

    if (byAmountIn) {
      return this.expectInputSwapV3WithMaxAmountIn(
        txb,
        inputCoin,
        router,
        maxAmountIn,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
        priceInfoObjectIds,
        partner ?? this.partner,
        undefined,
        pythCoreV2PriceIDs
      )
    } else {
      // Fixed-output swaps use the same v3 quote guard and max-input bound.
      return this.expectOutputSwapV3WithMaxAmountIn(
        txb,
        inputCoin,
        router,
        maxAmountIn,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
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
      sponsored = false,
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
      useGasCoin: !sponsored,
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

    await this.deliverTargetCoin(
      txb,
      targetCoin,
      targetCoinType,
      router.packages,
      sponsored
    )
  }

  // Delivers a swap's output coin. In sponsored mode the SDK must not query or touch
  // coins through `this.signer`, because the transaction sender may be different from
  // the SDK instance signer. Let the router transfer helper deliver the output to the
  // transaction sender instead.
  private async deliverTargetCoin(
    txb: Transaction,
    targetCoin: TransactionObjectArgument,
    targetCoinType: string,
    packages: Map<string, string> | undefined,
    sponsored: boolean
  ) {
    if (sponsored) {
      transferOrDestroyCoin(
        {
          coin: targetCoin,
          coinType: targetCoinType,
          packages,
        },
        txb
      )
      return
    }

    if (CoinUtils.isSuiCoin(targetCoinType)) {
      txb.mergeCoins(txb.gas, [targetCoin])
      return
    }

    const targetCoinObjID = await this.getOneCoinUsedToMerge(targetCoinType)
    if (targetCoinObjID != null) {
      txb.mergeCoins(txb.object(targetCoinObjID), [targetCoin])
    } else {
      transferOrDestroyCoin(
        {
          coin: targetCoin,
          coinType: targetCoinType,
          packages,
        },
        txb
      )
    }
  }

  async mergeSwap(
    params: BuildMergeSwapParams
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoins, slippage, txb, partner } = params

    slippageToContractValue(slippage)

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
    const { router, slippage, txb, partner, sponsored = false } = params

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
        useGasCoin: !sponsored && CoinUtils.isSuiCoin(firstCoinType),
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

    // Auto merge, transfer or destroy target coin (sponsorship-aware)
    await this.deliverTargetCoin(
      txb,
      targetCoin,
      targetCoinType,
      router.packages,
      sponsored
    )
  }

  async fixableRouterSwapV3(
    params: BuildRouterSwapParamsV3
  ): Promise<TransactionObjectArgument> {
    const { router, inputCoin, slippage, txb, partner } = params

    slippageToContractValue(slippage)

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

    const { legacy: priceInfoObjectIds, coreV2: pythCoreV2PriceIDs } =
      await this.preparePythPriceInfoObjects(router.paths, txb)

    if (router.byAmountIn) {
      return this.expectInputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
        priceInfoObjectIds,
        partner ?? this.partner,
        undefined,
        pythCoreV2PriceIDs
      )
    } else {
      return this.expectOutputSwapV3(
        txb,
        inputCoin,
        router,
        expectedAmountIn.toString(),
        expectedAmountOut.toString(),
        slippage,
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

    const simulateRes = await this.client.simulateTransaction({
      transaction: tx,
      include: { events: true, effects: true },
    })

    const txResult = simulateRes.Transaction ?? simulateRes.FailedTransaction
    if (!txResult || simulateRes.$kind === 'FailedTransaction') {
      const errorMsg = txResult?.status.success === false
        ? txResult.status.error.message
        : "Unknown error"
      throw new Error("Simulation error: " + errorMsg)
    }

    const events = txResult.events ?? []
    const valueData = events.filter((item) => {
      return item.eventType.includes("CalculatedSwapResultEvent")
    })

    if (valueData.length === 0 || valueData.length !== pools.length) {
      throw new Error("Simulate event result error")
    }

    let tempMaxAmount = byAmountIn ? new BN(0) : new BN(Constants.U64_MAX)
    let tempIndex = 0
    for (let i = 0; i < valueData.length; i += 1) {
      const eventJson = valueData[i].json as Record<string, any> | null
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
        // Fixed output: a pool is only valid if it returns exactly the
        // requested amount_out; among valid pools, minimize the total
        // required input (amount_in + fee_amount).
        const amountOut = new BN(eventJson?.data?.amount_out ?? 0)
        if (!amountOut.eq(amount)) {
          continue
        }
        const pureAmountIn = new BN(eventJson?.data?.amount_in ?? 0)
        const feeAmount = new BN(eventJson?.data?.fee_amount ?? 0)
        const totalAmountIn = pureAmountIn.add(feeAmount)
        if (totalAmountIn.lt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = totalAmountIn
        }
      }
    }

    const eventJson = valueData[tempIndex].json as Record<string, any> | null
    const eventData = eventJson?.data

    const [decimalA, decimalB] = await Promise.all([
      this.client.getCoinMetadata({ coinType: coinA }).then(res => res.coinMetadata?.decimals ?? null),
      this.client.getCoinMetadata({ coinType: coinB }).then(res => res.coinMetadata?.decimals ?? null),
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
    return this.updatePriceIDsWithAdapter(this.pythAdapter, priceIDs, txb)
  }

  // Same flow as updatePythPriceIDs but against the new Pyth core deployment.
  // Only HAEDALPROPAMM consumes the resulting PriceInfoObjects.
  async updatePythCoreV2PriceIDs(
    priceIDs: string[],
    txb: Transaction
  ): Promise<Map<string, string>> {
    return this.updatePriceIDsWithAdapter(this.pythAdapterV2, priceIDs, txb)
  }

  private async updatePriceIDsWithAdapter(
    adapter: PythAdapter,
    priceIDs: string[],
    txb: Transaction
  ): Promise<Map<string, string>> {
    const priceUpdateData = await adapter.getPriceFeedsUpdateData(priceIDs)

    let priceInfoObjectIds: string[]
    try {
      priceInfoObjectIds = await adapter.updatePriceFeeds(
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

  // Updates legacy-deployment feeds and (for HAEDALPROPAMM paths) new-deployment
  // feeds in the same txb. The two maps are kept separate: the same seed can
  // resolve to a different PriceInfoObject on each deployment.
  private async preparePythPriceInfoObjects(
    paths: Path[],
    txb: Transaction
  ): Promise<{ legacy: Map<string, string>; coreV2: Map<string, string> }> {
    const priceIDs = findPythPriceIDs(paths)
    const legacy =
      priceIDs.length > 0
        ? await this.updatePythPriceIDs(priceIDs, txb)
        : new Map<string, string>()

    const v2PriceIDs = findPythCoreV2PriceIDs(paths)
    const coreV2 =
      v2PriceIDs.length > 0
        ? await this.updatePythCoreV2PriceIDs(v2PriceIDs, txb)
        : new Map<string, string>()

    return { legacy, coreV2 }
  }

  async devInspectTransactionBlock(txb: Transaction) {
    txb.setSenderIfNotSet(this.signer || "0x0")
    const res = await this.client.simulateTransaction({
      transaction: txb,
      include: { events: true, effects: true },
    })
    return res
  }

  async sendTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
      include: { effects: true, events: true, balanceChanges: true },
    })
    return res
  }

  // ---------------------------------------------------------------------------
  // Sponsored transactions
  //
  // A sponsored transaction lets a sponsor (gas station) pay gas for a transaction
  // whose commands are authored by a different sender. The sender and the sponsor both
  // sign the same transaction bytes, and the transaction is submitted with both
  // signatures. See: https://docs.sui.io/concepts/transactions/sponsored-transactions
  //
  // Build the swap with `sponsored: true` (e.g. `fastRouterSwap`/`fastMergeSwap`) so the
  // gas coin is never used, then:
  //   - Remote gas station: `buildTransactionKind(txb, sender)` -> station assembles gas
  //     data with `buildSponsoredTransaction` -> station builds/signs full bytes -> user
  //     signs the same bytes -> `executeWithSignatures`.
  //   - Local sponsor (both keypairs available): `signAndExecuteSponsoredTransaction`.
  // ---------------------------------------------------------------------------

  // Builds the TransactionKind bytes (commands only, no gas data) to hand to a sponsor /
  // gas station. Pass `sender` when the transaction contains CoinWithBalance intents,
  // because those are resolved while building the kind.
  async buildTransactionKind(
    txb: Transaction,
    sender?: string
  ): Promise<Uint8Array> {
    if (sender) {
      txb.setSender(sender)
    }
    return txb.build({ client: this.client, onlyTransactionKind: true })
  }

  // Assembles a sponsored transaction from TransactionKind bytes plus the gas data
  // provided by the sponsor. The returned transaction is ready to be built and signed by
  // both the sender and the sponsor.
  buildSponsoredTransaction(
    params: BuildSponsoredTransactionParams
  ): Transaction {
    const { txKindBytes, sender, sponsor, sponsorCoins, gasBudget, gasPrice } =
      params

    const tx = Transaction.fromKind(txKindBytes)
    tx.setSender(sender)
    tx.setGasOwner(sponsor)
    tx.setGasPayment(sponsorCoins)
    if (gasBudget != null) {
      tx.setGasBudget(gasBudget)
    }
    if (gasPrice != null) {
      tx.setGasPrice(gasPrice)
    }
    return tx
  }

  // Builds the full transaction bytes (including gas data) that both parties must sign.
  // Returns the exact bytes the signatures must be produced over.
  async buildTransactionBytes(txb: Transaction): Promise<Uint8Array> {
    return txb.build({ client: this.client })
  }

  // Executes a transaction from pre-built bytes plus the collected signatures. The
  // signatures MUST be produced over exactly these `bytes` (see `buildTransactionBytes`).
  async executeWithSignatures(bytes: Uint8Array, signatures: string[]) {
    return this.client.executeTransaction({
      transaction: bytes,
      signatures,
      include: { effects: true, events: true, balanceChanges: true },
    })
  }

  // Convenience for the local dual-key case: signs the transaction with both the user's
  // and the sponsor's signer and executes it. `txb` must already have its sender, gas
  // owner and gas payment set (e.g. via `buildSponsoredTransaction`).
  async signAndExecuteSponsoredTransaction(
    txb: Transaction,
    userSigner: Signer,
    sponsorSigner: Signer
  ) {
    const bytes = await txb.build({ client: this.client })
    const { signature: sponsorSig } = await sponsorSigner.signTransaction(bytes)
    const { signature: userSig } = await userSigner.signTransaction(bytes)
    return this.executeWithSignatures(bytes, [userSig, sponsorSig])
  }
}

/**
 * Opt-in verification for executed transaction results: inspects the effects
 * and throws an AggregatorError when the transaction failed on-chain.
 *
 * - Aggregator contract aborts (the `errors` module of the aggregator v3
 *   package, e.g. slippage check failure) are thrown with a typed errorCode
 *   such as TransactionErrorCode.AmountOutSlippageCheckFailed and a
 *   human-readable message. Check with AggregatorError.isAggregatorErrorCode().
 * - Any other on-chain failure is thrown with the raw error string as message
 *   and errorCode TransactionErrorCode.TransactionFailed.
 *
 * Call it on the result of sendTransaction / executeWithSignatures, or on any
 * execution result obtained via wallet adapters. Execution methods themselves
 * do NOT throw on failure — their behavior is unchanged from prior versions.
 *
 * Example:
 *   const res = await client.sendTransaction(txb, signer)
 *   throwOnAggregatorContractFailure(res)
 */
export function throwOnAggregatorContractFailure(result: unknown): void {
  const errorMessage = extractEffectsErrorMessage(result)
  if (errorMessage === null) {
    return
  }

  const parsed = parseAggregatorContractError(errorMessage)
  if (parsed) {
    throw new AggregatorError(
      `${parsed.msg} (abort code ${parsed.code}${
        parsed.command !== undefined ? `, command ${parsed.command}` : ""
      })`,
      parsed.errorCode
    )
  }

  throw new AggregatorError(errorMessage, TransactionErrorCode.TransactionFailed)
}

// Extracts the failure message from transaction effects, supporting both the
// current @mysten/sui effects shape ({ success: boolean, error: { message } })
// and the legacy JSON-RPC shape ({ status: "failure", error: string }).
// Returns null when the transaction succeeded or effects are absent.
function extractEffectsErrorMessage(result: unknown): string | null {
  const effects = (result as any)?.effects ?? (result as any)?.Transaction?.effects
  const status = effects?.status
  if (!status) {
    return null
  }

  // Current shape: { success: boolean, error: { message: string } | null }
  if (typeof status.success === "boolean") {
    if (status.success) {
      return null
    }
    return (
      status.error?.message ??
      (typeof status.error === "string" ? status.error : "Unknown error")
    )
  }

  // Legacy shape: { status: "success" | "failure", error?: string }
  if (typeof status.status === "string") {
    if (status.status !== "failure") {
      return null
    }
    return typeof status.error === "string"
      ? status.error
      : status.error?.message ?? "Unknown error"
  }

  return null
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function validatePythAvailabilityCheckInterval(
  interval: number | undefined
): number | undefined {
  if (interval === undefined) {
    return undefined
  }
  if (!Number.isFinite(interval) || interval < 0) {
    throw new Error(
      "pythAvailabilityCheckInterval must be a non-negative number"
    )
  }
  return interval
}

function emptyRouterResult(byAmountIn: boolean): RouterDataV3 {
  return {
    quoteID: "",
    amountIn: Constants.ZERO,
    amountOut: Constants.ZERO,
    paths: [],
    byAmountIn,
    insufficientLiquidity: true,
    deviationRatio: 0,
  }
}

function emptyMergeSwapResult(): MergeSwapRouterData {
  return {
    quoteID: "",
    totalAmountOut: Constants.ZERO,
    allRoutes: [],
  }
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
