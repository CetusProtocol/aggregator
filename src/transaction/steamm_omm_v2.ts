import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2Extend2PublishedAt, Path } from ".."

export class SteammOmmV2 implements Dex {
  private pythPriceIDs: Map<string, string>

  private oraclePackageId: string

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Steamm omm v2 only supported on mainnet")
    }
    this.pythPriceIDs = pythPriceIDs
    this.oraclePackageId = "0xe84b649199654d18c38e727212f5d8dacfc3cf78d60d0a7fc85fd589f280eb2b"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    } else {
      if (path.extendedDetails.steammBankA == null) {
        throw new Error("Steamm bank a type not supported")
      }
      if (path.extendedDetails.steammBankB == null) {
        throw new Error("Steamm bank b type not supported")
      }
      if (path.extendedDetails.steammLendingMarket == null) {
        throw new Error("Steamm lending market not supported")
      }
      if (path.extendedDetails.steammLendingMarketType == null) {
        throw new Error("Steamm lending market type not supported")
      }
      if (path.extendedDetails.steammBCoinAType == null) {
        throw new Error("Steamm b coin a type not supported")
      }
      if (path.extendedDetails.steammBCoinBType == null) {
        throw new Error("Steamm b coin b type not supported")
      }
      if (path.extendedDetails.steammLPToken == null) {
        throw new Error("Steamm lp token not supported")
      }
      if (path.extendedDetails.steammOracleRegistryId == null) {
        throw new Error("Steamm oracle registry id not supported")
      }
      if (path.extendedDetails.steammOracleIndexA == null) {
        throw new Error("Steamm oracle index a not supported")
      }
      if (path.extendedDetails.steammOracleIndexB == null) {
        throw new Error("Steamm oracle index b not supported")
      }
      if (path.extendedDetails.steammOraclePythPriceSeedA == null) {
        throw new Error("Steamm oracle pyth price seed a not supported")
      }
      if (path.extendedDetails.steammOraclePythPriceSeedB == null) {
        throw new Error("Steamm oracle pyth price seed b not supported")
      }
    }

    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    const priceSeedA = path.extendedDetails.steammOraclePythPriceSeedA
    const priceSeedB = path.extendedDetails.steammOraclePythPriceSeedB
    const priceInfoObjectIdA = this.pythPriceIDs.get(priceSeedA)
    const priceInfoObjectIdB = this.pythPriceIDs.get(priceSeedB)
    if (!priceInfoObjectIdA || !priceInfoObjectIdB) {
      throw new Error("Base price info object id or quote price info object id not found")
    }

    const oraclePriceUpdateA = txb.moveCall({
      target: `${this.oraclePackageId}::oracles::get_pyth_price`,
      typeArguments: [],
      arguments: [
        txb.object(path.extendedDetails.steammOracleRegistryId), 
        txb.object(priceInfoObjectIdA), 
        txb.pure.u64(path.extendedDetails.steammOracleIndexA),
        txb.object(CLOCK_ADDRESS)
      ],
    }) as TransactionObjectArgument

    const oraclePriceUpdateB = txb.moveCall({
      target: `${this.oraclePackageId}::oracles::get_pyth_price`,
      typeArguments: [],
      arguments: [
        txb.object(path.extendedDetails.steammOracleRegistryId), 
        txb.object(priceInfoObjectIdB), 
        txb.pure.u64(path.extendedDetails.steammOracleIndexB), 
        txb.object(CLOCK_ADDRESS)
      ],
    }) as TransactionObjectArgument

    const args = [
      txb.object(path.id),
      txb.object(path.extendedDetails.steammBankA),
      txb.object(path.extendedDetails.steammBankB),
      txb.object(path.extendedDetails.steammLendingMarket),
      oraclePriceUpdateA,
      oraclePriceUpdateB,
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2Extend2PublishedAt(client.publishedAtV2Extend2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::steamm_omm_v2::${func}`,
      typeArguments: [
        path.extendedDetails.steammLendingMarketType,
        coinAType, 
        coinBType,
        path.extendedDetails.steammBCoinAType,
        path.extendedDetails.steammBCoinBType,
        path.extendedDetails.steammLPToken,
      ],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}
