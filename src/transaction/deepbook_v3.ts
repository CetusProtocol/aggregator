import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."
import { mintZeroCoin } from "~/utils/coin"

export type CetusFlashSwapResult = {
  targetCoin: TransactionObjectArgument
  flashReceipt: TransactionObjectArgument
  payAmount: TransactionArgument
}

export class DeepbookV3 implements Dex {
  private deepbookV3Config: string

  constructor(env: Env) {
    this.deepbookV3Config =
      env === Env.Mainnet
        ? "0xe4099d0cda04f3aa80028fac91a9b3dbe50d08f2ff42aa2c29473926e34ca48c"
        : "0xe19b5d072346cae83a037d4e3c8492068a74410a74e5830b3a68012db38296aa"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    deepbookv3DeepFee?: TransactionObjectArgument
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path
    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    let deepFee
    if (deepbookv3DeepFee) {
      deepFee = deepbookv3DeepFee
    } else {
      deepFee = mintZeroCoin(txb, client.deepbookv3DeepFeeType())
    }

    const args = [
      txb.object(this.deepbookV3Config),
      txb.object(path.id),
      inputCoin,
      deepFee,
      txb.object(CLOCK_ADDRESS),
    ]
    const res = txb.moveCall({
      target: `${client.publishedAtV2()}::deepbookv3::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
