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

export class Obric implements Dex {
  private pythPriceIDs: Map<string, string>
  private pythStateObjectId: string

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env === Env.Testnet) {
      throw new Error("Obric is not supported on testnet")
    }
    this.pythPriceIDs = pythPriceIDs
    this.pythStateObjectId = "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8"
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

    let coinAPriceSeed
    let coinBPriceSeed

    let coinAPriceInfoObjectId
    let coinBPriceInfoObjectId

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported in obric")
    } else {
      if (
        path.extendedDetails.obricCoinAPriceSeed && path.extendedDetails.obricCoinBPriceSeed
      ) {
        coinAPriceSeed = path.extendedDetails.obricCoinAPriceSeed
        coinAPriceInfoObjectId = this.pythPriceIDs.get(coinAPriceSeed!)
        coinBPriceSeed = path.extendedDetails.obricCoinBPriceSeed
        coinBPriceInfoObjectId = this.pythPriceIDs.get(coinBPriceSeed!)
      } else {
        if (!path.extendedDetails.obricCoinAPriceId || !path.extendedDetails.obricCoinBPriceId) {
          throw new Error("Base price id or quote price id not supported")
        } else {
          coinAPriceInfoObjectId = path.extendedDetails.obricCoinAPriceId
          coinBPriceInfoObjectId = path.extendedDetails.obricCoinBPriceId
        }
      }
    }

    if (!coinAPriceInfoObjectId || !coinBPriceInfoObjectId) {
      throw new Error(
        "Base price info object id or quote price info object id not found"
      )
    }

    const args = [
      txb.object(path.id),
      inputCoin,
      txb.object(this.pythStateObjectId),
      txb.object(coinAPriceInfoObjectId),
      txb.object(coinBPriceInfoObjectId),
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2ExtendPublishedAt(
      client.publishedAtV2Extend(),
      packages
    )
    const res = txb.moveCall({
      target: `${publishedAt}::obric::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
