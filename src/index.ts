// Export client modules
export * from "./client"

// Export core modules
export * from "./config"
export * from "./utils"
export * from "./const"
export * from "./errors"
export * from "./api"
export * from "./params"

// Export utility functions needed by v2 transactions
export {
  getAggregatorV2PublishedAt,
  getAggregatorV2ExtendPublishedAt,
  getAggregatorV2Extend2PublishedAt,
} from "./utils/config"
export { processEndpoint } from "./utils/api"

// Export interfaces needed by v2 transactions
export type { Dex } from "./utils/dex"

// Export shared types explicitly to avoid conflicts
export * from "./types/shared"

// Export merge swap specific types
export type { MergeSwapRouterData, MergeRoute } from "./types/shared"

// Export other type modules
export * from "./types/CoinAssist"
export * from "./types/sui"
