import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, getAggregatorV2ExtendPublishedAt, Path } from ".."

export class HaWAL implements Dex {
  private staking: string
  private validator: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("HaWAL only supported on mainnet")
    }

    this.staking =
      env === Env.Mainnet
        ? "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904"
        : "0x0"

    this.validator =
      env === Env.Mainnet
        ? "0x7b3ba6de2ae58283f60d5b8dc04bb9e90e4796b3b2e0dea75569f491275242e7"
        : "0x0"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction } = path
    const func = direction ? "swap_a2b" : "swap_b2a"
    const args = [
      txb.object(this.staking),
      txb.object(path.id),
      inputCoin,
      txb.object(this.validator),
    ]
    const publishedAt = getAggregatorV2ExtendPublishedAt(client.publishedAtV2Extend(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::hawal::${func}`,
      typeArguments: [],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
