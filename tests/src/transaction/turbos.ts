import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2PublishedAt, Path } from ".."

export class Turbos implements Dex {
  private versioned: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Turbos only supported on mainnet")
    }

    this.versioned =
      "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f"
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

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    } else {
      if (path.extendedDetails.turbosFeeType == null) {
        throw new Error("Turbos fee type not supported")
      }
    }

    const args = [
      txb.object(path.id),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
      txb.object(this.versioned),
    ]
    const publishedAt = getAggregatorV2PublishedAt(client.publishedAtV2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::turbos::${func}`,
      typeArguments: [coinAType, coinBType, path.extendedDetails.turbosFeeType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
