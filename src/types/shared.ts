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
  liquidityChanges?: PreSwapLpChangeParams[]
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
  froms: MergeSwapFromCoin[]
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
  froms: MergeSwapFromCoin[]
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
  sevenk_coin_a_price_seed?: string
  sevenk_coin_b_price_seed?: string
  sevenk_oracle_config_a?: string
  sevenk_oracle_config_b?: string
  sevenk_lp_cap_type?: string
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
