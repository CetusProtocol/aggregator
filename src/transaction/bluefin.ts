import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2ExtendPublishedAt, Path } from ".."

export class Bluefin implements Dex {
  private globalConfig: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Bluefin only supported on mainnet")
    }

    this.globalConfig =
      "0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352"
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
      txb.object(this.globalConfig),
      txb.object(path.id),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2ExtendPublishedAt(client.publishedAtV2Extend(), packages)

    const res = txb.moveCall({
      target: `${publishedAt}::bluefin::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
