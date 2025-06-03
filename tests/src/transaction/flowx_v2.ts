import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, getAggregatorV2PublishedAt, Path } from ".."

export class FlowxV2 implements Dex {
  private container: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Flowx only supported on mainnet")
    }

    this.container =
      "0xb65dcbf63fd3ad5d0ebfbf334780dc9f785eff38a4459e37ab08fa79576ee511"
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

    const args = [txb.object(this.container), inputCoin]
    const publishedAt = getAggregatorV2PublishedAt(client.publishedAtV2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::flowx_amm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
