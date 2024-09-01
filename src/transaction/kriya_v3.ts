import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."

export class KriyaV3 implements Dex {
  private version: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Kriya clmm only supported on mainnet")
    }

    this.version =
      "0xf5145a7ac345ca8736cf8c76047d00d6d378f30e81be6f6eb557184d9de93c78"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument
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

    const res = txb.moveCall({
      target: `${client.publishedAt()}::kriya_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
