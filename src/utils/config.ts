import { PUBLISHED_ADDRESSES } from '../const'

export function getAggregatorV2PublishedAt(
  publishedAt: string,
  packages?: Map<string, string>
): string {
  if (packages?.has('aggregator_v2')) {
    return packages.get('aggregator_v2')!
  }
  return publishedAt || PUBLISHED_ADDRESSES.V2.Mainnet
}

export function getAggregatorV2ExtendPublishedAt(
  publishedAt: string,
  packages?: Map<string, string>
): string {
  if (packages?.has('aggregator_v2_extend')) {
    return packages.get('aggregator_v2_extend')!
  }
  return publishedAt || PUBLISHED_ADDRESSES.V2_EXTEND.Mainnet
}

export function getAggregatorV2Extend2PublishedAt(
  publishedAt: string,
  packages?: Map<string, string>
): string {
  if (packages?.has('aggregator_v2_extend2')) {
    return packages.get('aggregator_v2_extend2')!
  }
  return publishedAt || PUBLISHED_ADDRESSES.V2_EXTEND2.Mainnet
}