import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Path } from ".."
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"

export const CLOCK_ADDRESS = SUI_CLOCK_OBJECT_ID

export const AGGREGATOR_V2 = "aggregator_v2"
export const AGGREGATOR_V2_EXTEND = "aggregator_v2_extend"

export function getAggregatorV2PublishedAt(
  aggregatorV2PublishedAt: string,
  packages?: Map<string, string> | Record<string, string>
) {
  if (packages instanceof Map) {
    return packages.get(AGGREGATOR_V2) ?? aggregatorV2PublishedAt
  }
  return aggregatorV2PublishedAt
}

export function getAggregatorV2ExtendPublishedAt(
  aggregatorV2ExtendPublishedAt: string,
  packages?: Map<string, string> | Record<string, string>
) {
  if (packages instanceof Map) {
    return packages.get(AGGREGATOR_V2_EXTEND) ?? aggregatorV2ExtendPublishedAt
  }
  return aggregatorV2ExtendPublishedAt
}

export interface Dex {
  swap(
    client: AggregatorClient,
    ptb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>,
    deepbookv3DeepFee?: TransactionObjectArgument
  ): Promise<TransactionObjectArgument>
}
