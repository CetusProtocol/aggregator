import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2Extend2PublishedAt, Path } from ".."

export class Momentum implements Dex {
  private version: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Momentum only supported on mainnet")
    }

    this.version =
      "0x2375a0b1ec12010aaea3b2545acfa2ad34cfbba03ce4b59f4c39e1e25eed1b2a"
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

    const args = [
      txb.object(path.id),
      inputCoin,
      txb.object(this.version),
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2Extend2PublishedAt(client.publishedAtV2Extend2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::momentum::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
