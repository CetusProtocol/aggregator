import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import {
  AggregatorClient,
  CLOCK_ADDRESS,
  Dex,
  Env,
  getAggregatorV2ExtendPublishedAt,
  Path,
} from ".."

export class HaedalPmm implements Dex {
  private pythPriceIDs: Map<string, string>

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env === Env.Testnet) {
      throw new Error("HaedalPmm is not supported on testnet")
    }
    this.pythPriceIDs = pythPriceIDs
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    let basePriceSeed: string
    let quotePriceSeed: string

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported haedal pmm")
    } else {
      if (
        !path.extendedDetails.haedalPmmBasePriceSeed ||
        !path.extendedDetails.haedalPmmQuotePriceSeed
      ) {
        throw new Error("Base price seed or quote price seed not supported")
      }
      basePriceSeed = path.extendedDetails.haedalPmmBasePriceSeed
      quotePriceSeed = path.extendedDetails.haedalPmmQuotePriceSeed
    }

    const basePriceInfoObjectId = this.pythPriceIDs.get(basePriceSeed)
    const quotePriceInfoObjectId = this.pythPriceIDs.get(quotePriceSeed)

    if (!basePriceInfoObjectId || !quotePriceInfoObjectId) {
      throw new Error(
        "Base price info object id or quote price info object id not found"
      )
    }

    const args = [
      txb.object(path.id),
      txb.object(basePriceInfoObjectId),
      txb.object(quotePriceInfoObjectId),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2ExtendPublishedAt(
      client.publishedAtV2Extend(),
      packages
    )
    const res = txb.moveCall({
      target: `${publishedAt}::haedalpmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
