import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, Path } from ".."

export class KriyaV2 implements Dex {
  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Kriya amm only supported on mainnet")
    }
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

    const args = [txb.object(path.id), inputCoin]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::kriya_amm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
