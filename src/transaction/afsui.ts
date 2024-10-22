import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, Path } from ".."

export class Afsui implements Dex {
  private stakedSuiVault: string
  private safe: string
  private referVault: string
  private validator: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Afsui only supported on mainnet")
    }

    this.stakedSuiVault =
      "0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d"
    this.safe =
      "0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610"
    this.referVault =
      "0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef"
    this.validator =
      "0xd30018ec3f5ff1a3c75656abf927a87d7f0529e6dc89c7ddd1bd27ecb05e3db2"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument
  ): Promise<TransactionObjectArgument> {
    const { direction } = path

    if (!direction) {
      throw new Error("Afsui not support b2a swap")
    }

    const func = "swap_a2b"

    const args = [
      txb.object(this.stakedSuiVault),
      txb.object(this.safe),
      txb.object("0x5"),
      txb.object(this.referVault),
      txb.object(this.validator),
      inputCoin,
    ]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::afsui::${func}`,
      typeArguments: [],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
