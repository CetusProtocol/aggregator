import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."

export type CetusFlashSwapResult = {
  targetCoin: TransactionObjectArgument
  flashReceipt: TransactionObjectArgument
  payAmount: TransactionArgument
}

export class Cetus implements Dex {
  private globalConfig: string
  private partner: string

  constructor(env: Env, partner?: string) {
    this.globalConfig =
      env === Env.Mainnet
        ? "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f"
        : "0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e"

    this.partner =
      partner ??
      (env === Env.Mainnet
        ? "0x639b5e433da31739e800cd085f356e64cae222966d0f1b11bd9dc76b322ff58b"
        : "0x1f5fa5c820f40d43fc47815ad06d95e40a1942ff72a732a92e8ef4aa8cde70a5")
  }

  flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    by_amount_in: boolean
  ): CetusFlashSwapResult {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["flash_swap_a2b", from, target]
      : ["flash_swap_b2a", target, from]
    let amount = by_amount_in ? path.amountIn : path.amountOut
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      txb.pure.u64(amount),
      txb.pure.bool(by_amount_in),
      txb.object(CLOCK_ADDRESS),
    ]
    const res: TransactionObjectArgument[] = txb.moveCall({
      target: `${client.publishedAt()}::cetus::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return {
      targetCoin: res[0],
      flashReceipt: res[1],
      payAmount: res[2],
    }
  }

  repay_flash_swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    receipt: TransactionArgument
  ): TransactionObjectArgument {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["repay_flash_swap_a2b", from, target]
      : ["repay_flash_swap_b2a", target, from]
    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      receipt,
    ]
    const res = txb.moveCall({
      target: `${client.publishedAt()}::cetus::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    })
    return res[0] as TransactionObjectArgument
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
      txb.object(this.globalConfig),
      txb.object(path.id),
      txb.object(this.partner),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAt()}::cetus::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
