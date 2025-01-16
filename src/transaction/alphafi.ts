import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, getAggregatorV2ExtendPublishedAt, Path } from ".."

export class Alphafi implements Dex {
  private sui_system_state: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Alphafi only supported on mainnet")
    }

    this.sui_system_state =
      env === Env.Mainnet
        ? "0x0000000000000000000000000000000000000000000000000000000000000005"
        : "0x0"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    const [func, stCoinType] = direction
      ? ["swap_a2b", target]
      : ["swap_b2a", from]

    const args = [
      txb.object(path.id),
      txb.object(this.sui_system_state),
      inputCoin,
    ]

    const publishedAt = getAggregatorV2ExtendPublishedAt(client.publishedAtV2Extend(), packages)

    const res = txb.moveCall({
      target: `${publishedAt}::alphafi::${func}`,
      typeArguments: [stCoinType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
