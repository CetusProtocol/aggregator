import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2ExtendPublishedAt, Path } from ".."

const SUPER_SUI_TYPE = "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI"
const MUSD_TYPE = "0xe44df51c0b21a27ab915fa1fe2ca610cd3eaa6d9666fe5e62b988bf7f0bd8722::musd::MUSD"
const METH_TYPE = "0xccd628c2334c5ed33e6c47d6c21bb664f8b6307b2ac32c2462a61f69a31ebcee::meth::METH"

export class Metastable implements Dex {
  private pythPriceIDs: Map<string, string>
  private versionID: string

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env !== Env.Mainnet) {
      throw new Error("Metastable only supported on mainnet")
    }
    this.versionID = "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c"
    this.pythPriceIDs = pythPriceIDs
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    const [func, createCapFunc, coinType, metaCoinType] = direction
      ? ["swap_a2b", "create_deposit_cap", from, target]
      : ["swap_b2a", "create_withdraw_cap", target, from]

    let createExchangePkgId = "";
    let createDepositModule = "pyth";
    let metaSingletonId = "";
    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported metastable")
    } else {
      if (
        !path.extendedDetails.metastableCreateCapPkgId ||
        !path.extendedDetails.metastableCreateCapModule ||
        !path.extendedDetails.metastableRegistryId ||
        !path.extendedDetails.metastableWhitelistedAppId
      ) {
        throw new Error("CreateCapPkgId or CreateCapModule or RegistryId or WhitelistedAppId or CreateCapAllTypeParams not supported")
      }
      createExchangePkgId = path.extendedDetails.metastableCreateCapPkgId
      createDepositModule = path.extendedDetails.metastableCreateCapModule
      metaSingletonId = path.extendedDetails.metastableWhitelistedAppId
    }

    const createDepositCapTypeArgs = [
      metaCoinType
    ]
    if (path.extendedDetails.metastableCreateCapAllTypeParams) {
      createDepositCapTypeArgs.push(coinType);
    }

    const depositArgs = [
      txb.object(metaSingletonId),
      txb.object(path.id),
    ]
    
    switch (metaCoinType) {
      case SUPER_SUI_TYPE: {
        if (!path.extendedDetails.metastableRegistryId) {
          throw new Error("Not found registry id for super sui")
        }
        depositArgs.push(txb.object(path.extendedDetails.metastableRegistryId));
        break;
      }
      case MUSD_TYPE: {
        if (path.extendedDetails.metastablePriceSeed != null) {
          const priceId = this.pythPriceIDs.get(path.extendedDetails.metastablePriceSeed)
          if (priceId == null) {
            throw new Error("Invalid Pyth price feed: " + path.extendedDetails.metastablePriceSeed)
          }
          depositArgs.push(txb.object(priceId));
        }
        if (path.extendedDetails.metastableETHPriceSeed != null) {
          const priceId = this.pythPriceIDs.get(path.extendedDetails.metastableETHPriceSeed)
          if (priceId == null) {
            throw new Error("Invalid Pyth price feed: " + path.extendedDetails.metastableETHPriceSeed)
          }
          depositArgs.push(txb.object(priceId));
        }
        depositArgs.push(txb.object(CLOCK_ADDRESS));
        break;
      }
      case METH_TYPE: {
        if (path.extendedDetails.metastablePriceSeed != null) {
          const priceId = this.pythPriceIDs.get(path.extendedDetails.metastablePriceSeed)
          if (priceId == null) {
            throw new Error("Invalid Pyth price feed: " + path.extendedDetails.metastablePriceSeed)
          }
          depositArgs.push(txb.object(priceId));
        }
        if (path.extendedDetails.metastableETHPriceSeed != null) {
          const priceId = this.pythPriceIDs.get(path.extendedDetails.metastableETHPriceSeed)
          if (priceId == null) {
            throw new Error("Invalid Pyth price feed: " + path.extendedDetails.metastableETHPriceSeed)
          }
          depositArgs.push(txb.object(priceId));
        }
        depositArgs.push(txb.object(CLOCK_ADDRESS));
        break;
      }

      default:
        throw new Error("Invalid Metacoin: " + metaCoinType);
    }

    const depositResult = txb.moveCall({
      target: `${createExchangePkgId}::${createDepositModule}::${createCapFunc}`,
      typeArguments: createDepositCapTypeArgs,
      arguments: depositArgs,
    }) as TransactionObjectArgument

    const swapArgs = [
      txb.object(path.id),
      txb.object(this.versionID),
      depositResult,
      inputCoin,
    ]

    const publishedAt = getAggregatorV2ExtendPublishedAt(client.publishedAtV2Extend(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::metastable::${func}`,
      typeArguments: [
        coinType, 
        metaCoinType,
      ],
      arguments: swapArgs,
    }) as TransactionObjectArgument

    return res
  }
}
