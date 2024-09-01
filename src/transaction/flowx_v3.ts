import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."

export class FlowxV3 implements Dex {
  private versioned: string
  private poolRegistry: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Flowx clmm only supported on mainnet")
    }

    this.versioned =
      "0x67624a1533b5aff5d0dfcf5e598684350efd38134d2d245f475524c03a64e656"
    this.poolRegistry =
      "0x27565d24a4cd51127ac90e4074a841bbe356cca7bf5759ddc14a975be1632abc"
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
      txb.object(this.poolRegistry),
      txb.pure.u64(path.feeRate * 1000000),
      inputCoin,
      txb.object(this.versioned),
      txb.object(CLOCK_ADDRESS),
    ]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::flowx_clmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
