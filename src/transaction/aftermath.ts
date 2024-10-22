import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, Path } from ".."
import BN from "bn.js"

export class Aftermath implements Dex {
  private slippage: string
  private poolRegistry: string
  private protocolFeeVault: string
  private treasury: string
  private insuranceFund: string
  private referrealVault: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Aftermath only supported on mainnet")
    }

    this.slippage = "900000000000000000"
    this.poolRegistry =
      "0xfcc774493db2c45c79f688f88d28023a3e7d98e4ee9f48bbf5c7990f651577ae"
    this.protocolFeeVault =
      "0xf194d9b1bcad972e45a7dd67dd49b3ee1e3357a00a50850c52cd51bb450e13b4"
    this.treasury =
      "0x28e499dff5e864a2eafe476269a4f5035f1c16f338da7be18b103499abf271ce"
    this.insuranceFund =
      "0xf0c40d67b078000e18032334c3325c47b9ec9f3d9ae4128be820d54663d14e3b"
    this.referrealVault =
      "0x35d35b0e5b177593d8c3a801462485572fc30861e6ce96a55af6dc4730709278"
  }

  amountLimit(exportAmountOut: number): number {
    return Number(
      new BN(exportAmountOut)
        .mul(new BN(this.slippage))
        .div(new BN("1000000000000000000"))
        .toString()
    )
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

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    } else {
      if (path.extendedDetails.aftermathLpSupplyType == null) {
        throw new Error("LP supply type not supported")
      }
    }

    const args = [
      txb.object(path.id),
      txb.object(this.poolRegistry),
      txb.object(this.protocolFeeVault),
      txb.object(this.treasury),
      txb.object(this.insuranceFund),
      txb.object(this.referrealVault),
      txb.pure.u64(this.amountLimit(path.amountOut)),
      txb.pure.u64(this.slippage),
      inputCoin,
    ]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::aftermath::${func}`,
      typeArguments: [
        coinAType,
        coinBType,
        path.extendedDetails.aftermathLpSupplyType,
      ],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
