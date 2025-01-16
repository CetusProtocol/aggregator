import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2ExtendPublishedAt, Path } from ".."
import { SuiPriceServiceConnection, SuiPythClient } from "@pythnetwork/pyth-sui-js"
import { SuiClient } from "@mysten/sui/client"

export class HaedalPmm implements Dex {
  private connection: SuiPriceServiceConnection
  private pythClient: SuiPythClient
  
  constructor(env: Env, suiClient: SuiClient) {
    if (env === Env.Testnet) {
      this.connection = new SuiPriceServiceConnection("https://hermes-beta.pyth.network")
      const wormholeStateId = "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790";
      const pythStateId = "0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c";
      this.pythClient = new SuiPythClient(suiClient, pythStateId, wormholeStateId)
    } else {
      this.connection = new SuiPriceServiceConnection("https://hermes.pyth.network")
      const wormholeStateId = "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c";
      const pythStateId = "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8";
      this.pythClient = new SuiPythClient(suiClient, pythStateId, wormholeStateId)
    }
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
    
    let basePriceSeed: string
    let quotePriceSeed: string

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported haedal pmm")
    } else {
      if (!path.extendedDetails.haedalPmmBasePriceSeed || !path.extendedDetails.haedalPmmQuotePriceSeed) {
        throw new Error("Base price seed or quote price seed not supported")
      }
      basePriceSeed = path.extendedDetails.haedalPmmBasePriceSeed
      quotePriceSeed = path.extendedDetails.haedalPmmQuotePriceSeed
    }

    const priceIDs = [basePriceSeed, quotePriceSeed]
    const priceUpdateData = await this.connection.getPriceFeedsUpdateData(priceIDs);
    const priceInfoObjectIds = await this.pythClient.updatePriceFeeds(txb, priceUpdateData, priceIDs);
    const args = [
      txb.object(path.id),
      txb.object(priceInfoObjectIds[0]),
      txb.object(priceInfoObjectIds[1]),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2ExtendPublishedAt(client.publishedAtV2Extend(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::haedalpmm::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}
