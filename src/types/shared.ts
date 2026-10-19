import BN from "bn.js"
import Decimal from "decimal.js"
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"

// Core parameter interfaces
export interface FindRouterParams {
  from: string
  target: string
  amount: BN | string | number | bigint
  byAmountIn: boolean
  depth?: number
  splitAlgorithm?: string
  splitFactor?: number
  splitCount?: number
  providers?: string[]
  /** Pool IDs to exclude from this quote (all hops/directions); at most 50. */
  excludePools?: string[]
  /** Only these pools may be used at every hop; empty means unrestricted. */
  includePools?: string[]
  pythAvailabilityCheckInterval?: number
  liquidityChanges?: PreSwapLpChangeParams[]
  /**
   * The slippage the caller intends to use when building the swap
   * (a fraction, e.g. 0.01 = 1%). Not sent to the router API.
   * When set at or below 0.001 (0.1%), providers that cannot honor such
   * tight slippage (currently CETUS_TIDE) are automatically removed from
   * the effective providers list.
   */
  slippage?: number
}

export interface MergeSwapFromCoin {
  coinType: string
  amount: BN | string | number | bigint
}

export interface MergeSwapParams {
  target: string
  byAmountIn: boolean
  depth?: number
  providers?: string[]
  /** Pool IDs to exclude from this quote (all hops/directions); at most 50. */
  excludePools?: string[]
  /** Only these pools may be used at every hop; empty means unrestricted. */
  includePools?: string[]
  pythAvailabilityCheckInterval?: number
  froms: MergeSwapFromCoin[]
  /**
   * The slippage the caller intends to use when building the swap
   * (a fraction, e.g. 0.01 = 1%). Not sent to the router API.
   * When set at or below 0.001 (0.1%), providers that cannot honor such
   * tight slippage (currently CETUS_TIDE) are automatically removed from
   * the effective providers list.
   */
  slippage?: number
}

export interface MergeSwapInputCoin {
  coinType: string
  coin: TransactionObjectArgument
}

export interface BuildMergeSwapParams {
  router: MergeSwapRouterData
  inputCoins: MergeSwapInputCoin[]
  slippage: number
  txb: Transaction
  partner?: string
}

export interface BuildFastMergeSwapParams {
  router: MergeSwapRouterData
  slippage: number
  txb: Transaction
  partner?: string
  payDeepFeeAmount?: number
  // When true, builds the swap for a sponsored transaction: never uses the gas coin
  // (which belongs to the sponsor). Input is taken from the sender's own coins and
  // output is delivered to the sender instead of being merged into the gas coin.
  sponsored?: boolean
}

export interface PreSwapLpChangeParams {
  poolID: string
  ticklower: number
  tickUpper: number
  deltaLiquidity: number
}

// Extended details type with all V3 capabilities
export type ExtendedDetails = {
  // aftermath
  aftermath_pool_flatness?: number
  aftermath_lp_supply_type?: string
  // turbos
  turbos_fee_type?: string
  // cetus
  afterSqrtPrice?: string
  // deepbookv3
  deepbookv3_deep_fee?: number
  deepbookv3_need_add_deep_price_point?: boolean
  deepbookv3_reference_pool_id?: string
  deepbookv3_reference_pool_base_type?: string
  deepbookv3_reference_pool_quote_type?: string
  // scallop
  scallop_scoin_treasury?: string
  // haedal
  haedal_pmm_base_price_seed?: string
  haedal_pmm_quote_price_seed?: string
  // haedal_hmm_v2
  haedalhmmv2_base_price_seed?: string
  // steamm
  steamm_bank_a?: string
  steamm_bank_b?: string
  steamm_lending_market?: string
  steamm_lending_market_type?: string
  steamm_btoken_a_type?: string
  steamm_btoken_b_type?: string
  steamm_lp_token_type?: string
  steamm_oracle_registry_id?: string
  steamm_oracle_pyth_price_seed_a?: string
  steamm_oracle_pyth_price_seed_b?: string
  steamm_oracle_index_a?: number
  steamm_oracle_index_b?: number

  // Snake_case versions for API response
  metastable_price_seed?: string
  metastable_eth_price_seed?: string
  metastable_whitelisted_app_id?: string
  metastable_create_cap_pkg_id?: string
  metastable_create_cap_module?: string
  metastable_create_cap_all_type_params?: boolean
  metastable_registry_id?: string
  // Snake_case versions for API response
  obric_coin_a_price_seed?: string
  obric_coin_b_price_seed?: string
  obric_coin_a_price_id?: string
  obric_coin_b_price_id?: string
  // Snake_case versions for V3 API response
  /** @deprecated SevenK DEX is no longer active. */
  sevenk_coin_a_price_seed?: string
  /** @deprecated SevenK DEX is no longer active. */
  sevenk_coin_b_price_seed?: string
  /** @deprecated SevenK DEX is no longer active. */
  sevenk_oracle_config_a?: string
  /** @deprecated SevenK DEX is no longer active. */
  sevenk_oracle_config_b?: string
  /** @deprecated SevenK DEX is no longer active. */
  sevenk_lp_cap_type?: string
  // bolt
  bolt_pool_id?: string
  bolt_oracle_id?: string
  bolt_quote_coin_type?: string
  // magmapropamm
  magmapropamm_pool_id?: string
  // haedalpropamm
  haedalpropamm_pool_id?: string
  haedalpropamm_regime_id?: string
  haedalpropamm_oracle_mode?: string
  haedalpropamm_base_price_seed?: string
  haedalpropamm_quote_price_seed?: string
  haedalpropamm_base_price_info_object?: string
  haedalpropamm_quote_price_info_object?: string
  // cetus tide
  cetus_tide_fill?: CetusTideFill
  cetus_tide_mm_object_id?: string
  cetus_tide_versioned?: string
  cetus_tide_global_config?: string
  /** 1 = orderbook, 2 = orderbook_v2. Missing is inferred from the signature shape. */
  cetus_tide_orderbook_version?: number
  aux_shared_versions?: Record<string, number>
}

export type CetusTideFill = {
  envelope: string // 0x + BCS bytes of SignedQuote/SignedQuoteV2
  signature?: string // V1 signature; omitted by V2 responses
  signatures?: string[] // V2 canonical signature bundle; omitted by V1 responses
  quote_hash: string // 0x + blake2b256(envelope_bytes)
  sig_expiry_ms: string | number // u64 wire
}

// Path type with V3 capabilities (using direction instead of a2b, string amounts)
export type Path = {
  id: string
  direction: boolean
  provider: string
  from: string
  target: string
  feeRate: number
  amountIn: string
  amountOut: string
  version?: string
  publishedAt?: string
  extendedDetails?: ExtendedDetails
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

// V3 authoritative RouterData with all capabilities
export type RouterData = {
  quoteID?: string
  amountIn: BN
  amountOut: BN
  byAmountIn: boolean
  routes: Router[]
  insufficientLiquidity: boolean
  deviationRatio?: number
  packages?: Map<string, string>
  totalDeepFee?: number
  error?: RouterError
  overlayFee?: number
}

export type RouterDataV3 = {
  quoteID?: string
  amountIn: BN
  amountOut: BN
  byAmountIn: boolean
  paths: Path[]
  insufficientLiquidity: boolean
  deviationRatio: number
  packages?: Map<string, string>
  totalDeepFee?: number
  error?: RouterError
  overlayFee?: number
}

export type RebalanceQuote = {
  domain: string
  coinIn: string
  coinOut: string
  amountIn: string
  amountOut: string
  issuedAtMs: string
  expiryMs: string
  signerVersion: string
}

/**
 * A successful response from the dedicated PQF rebalance quote endpoint.
 * The signed fields are optional so API error responses can use the same
 * RouterDataV3 error shape as ordinary route requests.
 */
export type RebalanceRouterData = RouterDataV3 & {
  rebalanceQuoteBcs?: string
  rebalanceQuoteSignature?: string
  rebalanceQuote?: RebalanceQuote
}

export type MergeRoute = {
  amountIn: BN
  amountOut: BN
  deviationRatio: string
  paths: Path[]
}

export type MergeSwapRouterData = {
  quoteID?: string
  totalAmountOut: BN
  allRoutes: MergeRoute[]
  packages?: Map<string, string>
  gas?: number
  error?: RouterError
}

// V3-specific types for flattened route processing
export type FlattenedPath = {
  path: Path
  isLastUseOfIntermediateToken: boolean
}

export type ProcessedRouterData = {
  quoteID: string
  amountIn: BN
  amountOut: BN
  byAmountIn: boolean
  flattenedPaths: FlattenedPath[]
  fromCoinType: string
  targetCoinType: string
  packages?: Map<string, string>
  totalDeepFee?: number
  error?: RouterError
  overlayFee?: number
}

export type AggregatorResponse = {
  code: number
  msg: string
  data: RouterData
}

// DeepBook V3 config types
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

// Type adapters for V2 compatibility
export type PathV2 = {
  id: string
  a2b: boolean // V2 uses a2b instead of direction
  provider: string
  from: string
  target: string
  feeRate: number
  amountIn: number // V2 uses number instead of string
  amountOut: number // V2 uses number instead of string
  extendedDetails?: ExtendedDetails
  version?: string
}

export type RouterV2 = {
  path: PathV2[]
  amountIn: BN
  amountOut: BN
  initialPrice: Decimal
}

export type RouterDataV2 = {
  amountIn: BN
  amountOut: BN
  routes: RouterV2[]
  insufficientLiquidity: boolean
}
