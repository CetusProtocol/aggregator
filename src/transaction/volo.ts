import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, Path } from ".."

export class Volo implements Dex {
  private nativePool: string
  private metadata: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Volo only supported on mainnet")
    }

    this.nativePool =
      "0x7fa2faa111b8c65bea48a23049bfd81ca8f971a262d981dcd9a17c3825cb5baf"
    this.metadata =
      "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument
  ): Promise<TransactionObjectArgument> {
    const { direction } = path

    if (!direction) {
      throw new Error("Volo not support b2a swap")
    }

    const func = "swap_a2b"

    const args = [
      txb.object(this.nativePool),
      txb.object(this.metadata),
      txb.object("0x5"),
      inputCoin,
    ]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::volo::${func}`,
      typeArguments: [],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
