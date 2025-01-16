import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, getAggregatorV2PublishedAt, Path } from ".."

export class Bluemove implements Dex {
  private dexInfo: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Bluemove only supported on mainnet")
    }

    this.dexInfo =
      "0x3f2d9f724f4a1ce5e71676448dc452be9a6243dac9c5b975a588c8c867066e92"
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

    const args = [txb.object(this.dexInfo), inputCoin]
    const publishedAt = getAggregatorV2PublishedAt(client.publishedAtV2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::bluemove::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
