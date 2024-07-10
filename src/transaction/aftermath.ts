import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorConfig, ENV } from "../config"
import {
  AFTERMATH_MODULE,
  AGGREGATOR,
  MAINNET_AFTERMATH_INSURANCE_FUND_ID,
  MAINNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID,
  MAINNET_AFTERMATH_REFERRAL_VAULT_ID,
  MAINNET_AFTERMATH_REGISTRY_ID,
  MAINNET_AFTERMATH_TREASURY_ID,
  SWAP_A2B_FUNC,
  SWAP_B2A_FUNC,
  TESTNET_AFTERMATH_INSURANCE_FUND_ID,
  TESTNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID,
  TESTNET_AFTERMATH_REFERRAL_VAULT_ID,
  TESTNET_AFTERMATH_REGISTRY_ID,
  TESTNET_AFTERMATH_TREASURY_ID,
} from "../const"
import { ConfigErrorCode, TransactionErrorCode } from "../errors"
import { createTarget } from "../utils"

export type AftermathSwapParams = {
  poolId: string
  amount: TransactionArgument
  amountOut: number
  amountLimit: number
  a2b: boolean
  byAmountIn: boolean
  coinA?: TransactionObjectArgument
  coinB?: TransactionObjectArgument
  useFullInputCoinAmount: boolean
  coinAType: string
  coinBType: string
  slippage: number
  lpSupplyType: string
}

export type AftermathSwapResult = {
  targetCoin: TransactionObjectArgument
  amountIn: TransactionArgument
  amountOut: TransactionArgument
  txb: Transaction
}

export async function AftermathAmmSwapMovecall(
  swapParams: AftermathSwapParams,
  txb: Transaction,
  config: AggregatorConfig
): Promise<AftermathSwapResult> {
  console.log("Aftermath amm swap param", swapParams)
  const aggregatorPackage = config.getPackage(AGGREGATOR)
  if (aggregatorPackage == null) {
    throw new AggregateError(
      "Aggregator package not set",
      ConfigErrorCode.MissAggregatorPackage
    )
  }
  const aggregatorPublishedAt = aggregatorPackage.publishedAt

  if (swapParams.a2b) {
    if (swapParams.coinA == null) {
      throw new AggregateError(
        "coinA is required",
        TransactionErrorCode.MissCoinA
      )
    }
  } else {
    if (swapParams.coinB == null) {
      throw new AggregateError(
        "coinB is required",
        TransactionErrorCode.MissCoinB
      )
    }
  }

  const poolRegistryID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_AFTERMATH_REGISTRY_ID
      : TESTNET_AFTERMATH_REGISTRY_ID

  const vaultID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID
      : TESTNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID

  const treasuryID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_AFTERMATH_TREASURY_ID
      : TESTNET_AFTERMATH_TREASURY_ID

  const insuranceFundID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_AFTERMATH_INSURANCE_FUND_ID
      : TESTNET_AFTERMATH_INSURANCE_FUND_ID

  const referrealVaultID =
    config.getENV() === ENV.MAINNET
      ? MAINNET_AFTERMATH_REFERRAL_VAULT_ID
      : TESTNET_AFTERMATH_REFERRAL_VAULT_ID

  const swapCoin = swapParams.a2b ? swapParams.coinA! : swapParams.coinB!

  const slippageArg = (1 - swapParams.slippage) * 1000000000000000000

  const args = [
    txb.object(swapParams.poolId),
    txb.object(poolRegistryID),
    txb.object(vaultID),
    txb.object(treasuryID),
    txb.object(insuranceFundID),
    txb.object(referrealVaultID),
    swapParams.amount,
    txb.pure.u64(swapParams.amountLimit),
    txb.pure.u64(swapParams.amountOut),
    txb.pure.u64(slippageArg),
    swapCoin,
    txb.pure.bool(swapParams.useFullInputCoinAmount),
  ]

  const func = swapParams.a2b ? SWAP_A2B_FUNC : SWAP_B2A_FUNC

  const target = createTarget(aggregatorPublishedAt, AFTERMATH_MODULE, func)

  const res = txb.moveCall({
    target,
    typeArguments: [
      swapParams.coinAType,
      swapParams.coinBType,
      swapParams.lpSupplyType,
    ],
    arguments: args,
  })
  return {
    targetCoin: res[0],
    amountIn: res[1],
    amountOut: res[2],
    txb,
  }
}
