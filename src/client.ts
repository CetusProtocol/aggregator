import Decimal from "decimal.js"
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { Signer } from "@mysten/sui/cryptography"
import BN from "bn.js"
import { SUI_FRAMEWORK_ADDRESS } from "@mysten/sui/utils"
import {
  Dex,
  Env,
  extractStructTagFromType,
  FindRouterParams,
  getRouterResult,
  Router,
  RouterData,
  getDeepbookV3Config,
  processEndpoint,
  DeepbookV3Config,
} from "."
import { Aftermath } from "./transaction/aftermath"
import { DeepbookV2 } from "./transaction/deepbook_v2"
import { KriyaV2 } from "./transaction/kriya_v2"
import { KriyaV3 } from "./transaction/kriya_v3"
import { FlowxV2 } from "./transaction/flowx_v2"
import { FlowxV3 } from "./transaction/flowx_v3"
import { Turbos } from "./transaction/turbos"
import { Cetus } from "./transaction/cetus"
import { swapInPools } from "./transaction/swap"
import { CalculateAmountLimit, CalculateAmountLimitBN } from "./math"
import { Haedal } from "./transaction/haedal"
import { Afsui } from "./transaction/afsui"
import { Volo } from "./transaction/volo"
import { Bluemove } from "./transaction/bluemove"
import { CoinAsset } from "./types/sui"
import { buildInputCoin } from "./utils/coin"
import { DeepbookV3 } from "./transaction/deepbook_v3"
import { Scallop } from "./transaction/scallop"
import { Suilend } from "./transaction/suilend"

export const CETUS = "CETUS"
export const DEEPBOOKV2 = "DEEPBOOK"
export const KRIYA = "KRIYA"
export const FLOWXV2 = "FLOWX"
export const FLOWXV3 = "FLOWXV3"
export const KRIYAV3 = "KRIYAV3"
export const TURBOS = "TURBOS"
export const AFTERMATH = "AFTERMATH"
export const HAEDAL = "HAEDAL"
export const VOLO = "VOLO"
export const AFSUI = "AFSUI"
export const BLUEMOVE = "BLUEMOVE"
export const DEEPBOOKV3 = "DEEPBOOKV3"
export const SCALLOP = "SCALLOP"
export const SUILEND = "SUILEND"
export const DEFAULT_ENDPOINT = "https://api-sui.cetus.zone/router_v2"

export type BuildRouterSwapParams = {
  routers: Router[]
  byAmountIn: boolean
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  partner?: string
  // This parameter is used to pass the Deep token object. When using the DeepBook V3 provider,
  // users must pay fees with Deep tokens in non-whitelisted pools.
  deepbookv3DeepFee?: TransactionObjectArgument
}

export type BuildFastRouterSwapParams = {
  routers: Router[]
  byAmountIn: boolean
  slippage: number
  txb: Transaction
  partner?: string
  isMergeTragetCoin?: boolean
  refreshAllCoins?: boolean
  payDeepFeeAmount?: number
}

export interface SwapInPoolsParams {
  from: string
  target: string
  amount: BN
  byAmountIn: boolean
  pools: string[]
}

export interface SwapInPoolsResult {
  isExceed: boolean
  routeData?: RouterData
}

export class AggregatorClient {
  public endpoint: string
  public signer: string
  public client: SuiClient
  public env: Env
  private allCoins: Map<string, CoinAsset[]>

  constructor(
    endpoint?: string,
    signer?: string,
    client?: SuiClient,
    env?: Env
  ) {
    this.endpoint = endpoint ? processEndpoint(endpoint) : DEFAULT_ENDPOINT
    this.client = client || new SuiClient({ url: getFullnodeUrl("mainnet") })
    this.signer = signer || ""
    this.env = env || Env.Mainnet
    this.allCoins = new Map<string, CoinAsset[]>()
  }

  async getCoins(
    coinType: string,
    refresh: boolean = true
  ): Promise<CoinAsset[]> {
    if (this.signer === "") {
      throw new Error("Signer is required, but not provided.")
    }

    let cursor = null
    let limit = 50

    if (!refresh) {
      const gotFromCoins = this.allCoins.get(coinType)
      if (gotFromCoins) {
        return gotFromCoins
      }
    }

    const allCoins: CoinAsset[] = []
    while (true) {
      const gotCoins = await this.client.getCoins({
        owner: this.signer,
        coinType,
        cursor,
        limit,
      })
      for (const coin of gotCoins.data) {
        allCoins.push({
          coinAddress: extractStructTagFromType(coin.coinType).source_address,
          coinObjectId: coin.coinObjectId,
          balance: BigInt(coin.balance),
        })
      }
      if (gotCoins.data.length < limit) {
        break
      }
      cursor = gotCoins.data[limit - 1].coinObjectId
    }

    this.allCoins.set(coinType, allCoins)
    return allCoins
  }

  async findRouters(params: FindRouterParams): Promise<RouterData | null> {
    return getRouterResult(this.endpoint, params)
  }

  async expectInputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routers: Router[],
    amountOutLimit: BN,
    partner?: string,
    deepbookv3DeepFee?: TransactionObjectArgument
  ) {
    if (routers.length === 0) {
      throw new Error("No router found")
    }
    const splitAmounts = routers.map((router) => router.amountIn.toString())
    const inputCoinType = routers[0].path[0].from
    const outputCoinType = routers[0].path[routers[0].path.length - 1].target
    const inputCoins = txb.splitCoins(inputCoin, splitAmounts)
    const outputCoins = []
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].path.length === 0) {
        throw new Error("Empty path")
      }
      let nextCoin = inputCoins[i] as TransactionObjectArgument
      for (const path of routers[i].path) {
        const dex = this.newDex(path.provider, partner)
        nextCoin = await dex.swap(this, txb, path, nextCoin, deepbookv3DeepFee)
      }

      outputCoins.push(nextCoin)
    }
    this.transferOrDestoryCoin(txb, inputCoin, inputCoinType)
    const mergedTargetCointhis = this.checkCoinThresholdAndMergeCoin(
      txb,
      outputCoins,
      outputCoinType,
      amountOutLimit
    )
    return mergedTargetCointhis
  }

  async expectOutputSwap(
    txb: Transaction,
    inputCoin: TransactionObjectArgument,
    routers: Router[],
    partner?: string
  ): Promise<TransactionObjectArgument> {
    const returnCoins: TransactionObjectArgument[] = []
    const receipts: TransactionObjectArgument[] = []
    const targetCoins = []
    const dex = new Cetus(this.env, partner)
    for (let i = 0; i < routers.length; i++) {
      const router = routers[i]
      for (let j = router.path.length - 1; j >= 0; j--) {
        const path = router.path[j]
        const flashSwapResult = dex.flash_swap(this, txb, path, false)
        returnCoins.unshift(flashSwapResult.targetCoin)
        receipts.unshift(flashSwapResult.flashReceipt)
      }

      let nextRepayCoin = inputCoin
      for (let j = 0; j < router.path.length; j++) {
        const path = router.path[j]
        const repayResult = dex.repay_flash_swap(
          this,
          txb,
          path,
          nextRepayCoin,
          receipts[j]
        )
        nextRepayCoin = returnCoins[j]
        if (j === 0) {
          inputCoin = repayResult
        } else {
          this.transferOrDestoryCoin(txb, repayResult, path.from)
        }
        if (j === router.path.length - 1) {
          targetCoins.push(nextRepayCoin)
        }
      }
    }
    const inputCoinType = routers[0].path[0].from
    this.transferOrDestoryCoin(txb, inputCoin, inputCoinType)
    if (targetCoins.length > 1) {
      const vec = txb.makeMoveVec({ elements: targetCoins.slice(1) })
      txb.moveCall({
        target: `${SUI_FRAMEWORK_ADDRESS}::pay::join_vec`,
        typeArguments: [routers[0].path[routers[0].path.length - 1].target],
        arguments: [targetCoins[0], vec],
      })
    }

    return targetCoins[0]
  }

  async swapInPools(
    params: SwapInPoolsParams
  ): Promise<SwapInPoolsResult | null> {
    let result
    try {
      result = await swapInPools(this.client, params, this.signer, this.env)
    } catch (e) {
      console.error("swapInPools error:", e)
      return null
    }
    return result
  }

  async routerSwap(
    params: BuildRouterSwapParams
  ): Promise<TransactionObjectArgument> {
    const {
      routers,
      inputCoin,
      slippage,
      byAmountIn,
      txb,
      partner,
      deepbookv3DeepFee,
    } = params
    const amountIn = routers.reduce(
      (acc, router) => acc.add(router.amountIn),
      new BN(0)
    )
    const amountOut = routers.reduce(
      (acc, router) => acc.add(router.amountOut),
      new BN(0)
    )
    const amountLimit = CalculateAmountLimitBN(
      byAmountIn ? amountOut : amountIn,
      byAmountIn,
      slippage
    )

    if (byAmountIn) {
      const targetCoin = await this.expectInputSwap(
        txb,
        inputCoin,
        routers,
        amountLimit,
        partner,
        deepbookv3DeepFee
      )
      return targetCoin
    }

    // When exact output, we will set slippage limit in split coin.
    const splitedInputCoins = txb.splitCoins(inputCoin, [
      amountLimit.toString(),
    ])
    this.transferOrDestoryCoin(txb, inputCoin, routers[0].path[0].from)
    const targetCoin = await this.expectOutputSwap(
      txb,
      splitedInputCoins[0],
      routers,
      partner
    )
    return targetCoin
  }

  // auto build input coin
  // auto merge, transfer or destory target coin.
  async fastRouterSwap(params: BuildFastRouterSwapParams) {
    const {
      routers,
      byAmountIn,
      slippage,
      txb,
      partner,
      isMergeTragetCoin,
      refreshAllCoins,
      payDeepFeeAmount,
    } = params

    const fromCoinType = routers[0].path[0].from

    let fromCoins = await this.getCoins(fromCoinType, refreshAllCoins)

    const targetCoinType = routers[0].path[routers[0].path.length - 1].target
    const amountIn = routers.reduce(
      (acc, router) => acc.add(router.amountIn),
      new BN(0)
    )
    const amountOut = routers.reduce(
      (acc, router) => acc.add(router.amountOut),
      new BN(0)
    )
    const amountLimit = CalculateAmountLimit(
      byAmountIn ? amountOut : amountIn,
      byAmountIn,
      slippage
    )
    const amount = byAmountIn ? amountIn : amountLimit
    const buildFromCoinRes = buildInputCoin(
      txb,
      fromCoins,
      BigInt(amount.toString()),
      fromCoinType
    )

    let deepCoin
    if (payDeepFeeAmount && payDeepFeeAmount > 0) {
      let deepCoins = await this.getCoins(this.deepbookv3DeepFeeType())
      deepCoin = buildInputCoin(
        txb,
        deepCoins,
        BigInt(payDeepFeeAmount),
        this.deepbookv3DeepFeeType()
      ).targetCoin
    }

    const targetCoin = await this.routerSwap({
      routers,
      inputCoin: buildFromCoinRes.targetCoin,
      slippage,
      byAmountIn,
      txb,
      partner,
      deepbookv3DeepFee: deepCoin,
    })

    if (isMergeTragetCoin) {
      let targetCoins = await this.getCoins(targetCoinType, refreshAllCoins)
      const targetCoinRes = buildInputCoin(
        txb,
        targetCoins,
        BigInt(0),
        targetCoinType
      )
      txb.mergeCoins(targetCoinRes.targetCoin, [targetCoin])
      if (targetCoinRes.isMintZeroCoin) {
        this.transferOrDestoryCoin(
          txb,
          targetCoinRes.targetCoin,
          targetCoinType
        )
      }
    } else {
      this.transferOrDestoryCoin(txb, targetCoin, targetCoinType)
    }
  }

  // Include cetus、deepbookv2、flowxv2 & v3、kriyav2 & v3、turbos、aftermath、haedal、afsui、volo、bluemove
  publishedAt(): string {
    if (this.env === Env.Mainnet) {
      return "0x11451575c775a3e633437b827ecbc1eb51a5964b0302210b28f5b89880be21a2" // version 5
    } else {
      // return "0x0ed287d6c3fe4962d0994ffddc1d19a15fba6a81533f3f0dcc2bbcedebce0637" // version 2
      return "0x52eae33adeb44de55cfb3f281d4cc9e02d976181c0952f5323648b5717b33934"
    }
  }

  // Include deepbookv3, scallop
  publishedAtV2(): string {
    if (this.env === Env.Mainnet) {
      // return "0x43811be4677f5a5de7bf2dac740c10abddfaa524aee6b18e910eeadda8a2f6ae" // version 1, deepbookv3
      // return "0x6d70ffa7aa3f924c3f0b573d27d29895a0ee666aaff821073f75cb14af7fd01a" // version 3, deepbookv3 & scallop
      return "0x16d9418726c26d8cb4ce8c9dd75917fa9b1c7bf47d38d7a1a22603135f0f2a56" // version 4 add suilend
    } else {
      return "0xfd8a73ef0a4b928da9c27fc287dc37c1ca64df71da8e8eac7ca9ece55eb5f448"
    }
  }

  deepbookv3DeepFeeType(): string {
    if (this.env === Env.Mainnet) {
      return "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP"
    } else {
      return "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP"
    }
  }

  transferOrDestoryCoin(
    txb: Transaction,
    coin: TransactionObjectArgument,
    coinType: string
  ) {
    txb.moveCall({
      target: `${this.publishedAt()}::utils::transfer_or_destroy_coin`,
      typeArguments: [coinType],
      arguments: [coin],
    })
  }

  checkCoinThresholdAndMergeCoin(
    txb: Transaction,
    coins: TransactionObjectArgument[],
    coinType: string,
    amountLimit: BN
  ) {
    let targetCoin = coins[0]
    if (coins.length > 1) {
      let vec = txb.makeMoveVec({ elements: coins.slice(1) })
      txb.moveCall({
        target: `${SUI_FRAMEWORK_ADDRESS}::pay::join_vec`,
        typeArguments: [coinType],
        arguments: [coins[0], vec],
      })
      targetCoin = coins[0]
    }
    if (amountLimit.gt(new BN(0))) {
      txb.moveCall({
        target: `${this.publishedAt()}::utils::check_coin_threshold`,
        typeArguments: [coinType],
        arguments: [targetCoin, txb.pure.u64(amountLimit.toString())],
      })
    }
    return targetCoin
  }

  newDex(provider: string, partner?: string): Dex {
    switch (provider) {
      case CETUS:
        return new Cetus(this.env, partner)
      case DEEPBOOKV2:
        return new DeepbookV2(this.env)
      case DEEPBOOKV3:
        return new DeepbookV3(this.env)
      case KRIYA:
        return new KriyaV2(this.env)
      case KRIYAV3:
        return new KriyaV3(this.env)
      case FLOWXV2:
        return new FlowxV2(this.env)
      case FLOWXV3:
        return new FlowxV3(this.env)
      case TURBOS:
        return new Turbos(this.env)
      case AFTERMATH:
        return new Aftermath(this.env)
      case HAEDAL:
        return new Haedal(this.env)
      case AFSUI:
        return new Afsui(this.env)
      case VOLO:
        return new Volo(this.env)
      case BLUEMOVE:
        return new Bluemove(this.env)
      case SCALLOP:
        return new Scallop(this.env)
      case SUILEND:
        return new Suilend(this.env)
      default:
        throw new Error(`Unsupported dex ${provider}`)
    }
  }

  async signAndExecuteTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showBalanceChanges: true,
      },
    })
    return res
  }

  async devInspectTransactionBlock(txb: Transaction) {
    const res = await this.client.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: this.signer,
    })

    return res
  }

  async sendTransaction(txb: Transaction, signer: Signer) {
    const res = await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer,
    })
    return res
  }

  async getDeepbookV3Config(): Promise<DeepbookV3Config | null> {
    const res = await getDeepbookV3Config(this.endpoint)
    if (res) {
      return res.data
    }
    return null
  }
}

export function parseRouterResponse(data: any): RouterData {
  let totalDeepFee = 0
  for (const route of data.routes) {
    for (const path of route.path) {
      if (path.extended_details && path.extended_details.deepbookv3_deep_fee) {
        totalDeepFee += Number(path.extended_details.deepbookv3_deep_fee)
      }
    }
  }

  let routerData: RouterData = {
    amountIn: new BN(data.amount_in.toString()),
    amountOut: new BN(data.amount_out.toString()),
    insufficientLiquidity: false,
    routes: data.routes.map((route: any) => {
      return {
        path: route.path.map((path: any) => {
          let version
          if (path.provider === AFTERMATH) {
            version =
              path.extended_details.aftermath_pool_flatness === 0 ? "v2" : "v3"
          }

          let extendedDetails
          if (
            path.provider === TURBOS ||
            path.provider === AFTERMATH ||
            path.provider === CETUS ||
            path.provider === DEEPBOOKV3 ||
            path.provider === SCALLOP
          ) {
            extendedDetails = {
              aftermathLpSupplyType:
                path.extended_details?.aftermath_lp_supply_type,
              turbosFeeType: path.extended_details?.turbos_fee_type,
              afterSqrtPrice: path.extended_details?.after_sqrt_price,
              deepbookv3DeepFee: path.extended_details?.deepbookv3_deep_fee,
              scallopScoinTreasury:
                path.extended_details?.scallop_scoin_treasury,
            }
          }

          return {
            id: path.id,
            direction: path.direction,
            provider: path.provider,
            from: path.from,
            target: path.target,
            feeRate: path.fee_rate,
            amountIn: path.amount_in,
            amountOut: path.amount_out,
            extendedDetails,
            version,
          }
        }),
        amountIn: new BN(route.amount_in.toString()),
        amountOut: new BN(route.amount_out.toString()),
        initialPrice: new Decimal(route.initial_price.toString()),
      }
    }),
    totalDeepFee: totalDeepFee,
  }

  return routerData
}
