import type { AggregatorConfig } from "./config"
import Decimal from "decimal.js"
import { SuiClient } from "@mysten/sui/client"
import { CoinAsset } from "./types/sui"
import { createTarget, extractStructTagFromType } from "./utils"
import { Transaction } from "@mysten/sui/transactions"
import {
  buildInputCoin,
  checkCoinThresholdAndMergeCoin,
  transferOrDestoryCoin,
} from "./transaction/common"
import { expectInputRouterSwap, expectOutputRouterSwap } from "./transaction"
import { CalculateAmountLimit } from "./math"
import { Signer } from "@mysten/sui/dist/cjs/cryptography"
import BN from "bn.js"
import { swapInPools } from "./transaction/swap"
import { completionCoin } from "./utils/coin"
import { SUI_FRAMEWORK_ADDRESS } from "@mysten/sui/utils"
import { AFTERMATH_AMM, JOIN_FUNC, PAY_MODULE } from "./const"

export type ExtendedDetails = {
  aftermathPoolFlatness?: number
  aftermathLpSupplyType?: string
  turbosFeeType?: string
}

export type Path = {
  id: string
  a2b: boolean
  provider: string
  from: string
  target: string
  feeRate: number
  amountIn: number
  amountOut: number
  extendedDetails?: ExtendedDetails
  version?: string
}

export type Router = {
  path: Path[]
  amountIn: BN
  amountOut: BN
  initialPrice: Decimal
}

export type RouterData = {
  amountIn: BN
  amountOut: BN
  routes: Router[]
}

export type AggregatorResponse = {
  code: number
  msg: string
  data: RouterData
}

export type BuildRouterSwapParams = {
  routers: Router[]
  amountIn: BN
  amountOut: BN
  byAmountIn: boolean
  slippage: number
  fromCoinType: string
  targetCoinType: string
  partner?: string
  isMergeTragetCoin?: boolean
  refreshAllCoins?: boolean
}

export interface FindRouterParams {
  from: string
  target: string
  amount: BN
  byAmountIn: boolean
  depth: number | null
  splitAlgorithm: string | null
  splitFactor: number | null
  splitCount: number | null
  providers: string[] | null
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
  private config: AggregatorConfig

  private wallet: string

  private client: SuiClient

  private allCoins: CoinAsset[]

  constructor(config: AggregatorConfig) {
    this.config = config
    this.client = new SuiClient({ url: config.getFullNodeUrl() })
    this.wallet = config.getWallet()
    this.allCoins = []
  }

  async getAllCoins(): Promise<CoinAsset[]> {
    let cursor = null
    let limit = 50

    const allCoins: CoinAsset[] = []

    while (true) {
      const gotAllCoins = await this.client.getAllCoins({
        owner: this.wallet,
        cursor,
        limit,
      })
      for (const coin of gotAllCoins.data) {
        allCoins.push({
          coinAddress: extractStructTagFromType(coin.coinType).source_address,
          coinObjectId: coin.coinObjectId,
          balance: BigInt(coin.balance),
        })
      }

      if (gotAllCoins.data.length < limit) {
        break
      }
      cursor = gotAllCoins.data[limit - 1].coinObjectId
    }

    return allCoins
  }

  async findRouter(
    fromRouterParams: FindRouterParams
  ): Promise<RouterData | null> {
    const {
      from,
      target,
      amount,
      byAmountIn,
      depth,
      splitAlgorithm,
      splitFactor,
      splitCount,
      providers,
    } = fromRouterParams
    const fromCoin = completionCoin(from)
    const targetCoin = completionCoin(target)

    let url =
      this.config.getAggregatorUrl() +
      `/find_routes?from=${fromCoin}&target=${targetCoin}&amount=${amount.toString()}&by_amount_in=${byAmountIn}`

    if (depth) {
      url += `&depth=${depth}`
    }

    if (splitAlgorithm) {
      url += `&split_algorithm=${splitAlgorithm}`
    }

    if (splitFactor) {
      url += `&split_factor=${splitFactor}`
    }

    if (splitCount) {
      url += `&split_count=${splitCount}`
    }

    if (providers) {
      if (providers.length > 0) {
        url += `&providers=${providers.join(",")}`
      }
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.data != null) {
      const res = parseRouterResponse(data.data)
      return res
    }

    return null
  }

  async swapInPools(
    params: SwapInPoolsParams
  ): Promise<SwapInPoolsResult | null> {
    let result
    try {
      result = await swapInPools(this.client, params, this.config)
    } catch (e) {
      return null
    }

    return result
  }

  async routerSwap(params: BuildRouterSwapParams): Promise<Transaction> {
    const {
      routers: _,
      amountIn,
      amountOut,
      byAmountIn,
      slippage,
      fromCoinType,
      targetCoinType,
      partner,
      isMergeTragetCoin,
      refreshAllCoins,
    } = params
    const amountLimit = CalculateAmountLimit(
      byAmountIn ? amountOut : amountIn,
      byAmountIn,
      slippage
    )

    const txb = new Transaction()

    if (refreshAllCoins || this.allCoins.length === 0) {
      this.allCoins = await this.getAllCoins()
    }

    const allCoins = this.allCoins
    let targetCoins = []

    if (byAmountIn) {
      const buildFromCoinRes = buildInputCoin(
        txb,
        allCoins,
        BigInt(amountIn.toString()),
        fromCoinType
      )
      const fromCoin = buildFromCoinRes.targetCoin
      const swapedCoins = await expectInputRouterSwap(
        this.client,
        params,
        txb,
        fromCoin,
        this.config,
        partner
      )
      const mergedCoin = checkCoinThresholdAndMergeCoin(
        txb,
        swapedCoins,
        targetCoinType,
        amountLimit,
        this.config
      )
      targetCoins.push(mergedCoin)
    } else {
      const fromCoin = buildInputCoin(
        txb,
        allCoins,
        BigInt(amountLimit),
        fromCoinType
      ).targetCoin
      const swapedCoins = await expectOutputRouterSwap(
        params,
        txb,
        fromCoin,
        this.config,
        partner
      )
      targetCoins.push(...swapedCoins)
    }

    if (isMergeTragetCoin) {
      const targetCoinRes = buildInputCoin(
        txb,
        allCoins,
        BigInt(0),
        targetCoinType
      )
      txb.mergeCoins(targetCoinRes.targetCoin, targetCoins)
      if (targetCoinRes.isMintZeroCoin) {
        transferOrDestoryCoin(
          txb,
          targetCoinRes.targetCoin,
          targetCoinType,
          this.config
        )
      }
    } else {
      if (targetCoins.length > 1) {
        const vec = txb.makeMoveVec({ elements: targetCoins.slice(1) })
        txb.moveCall({
          target: createTarget(SUI_FRAMEWORK_ADDRESS, PAY_MODULE, JOIN_FUNC),
          typeArguments: [targetCoinType],
          arguments: [targetCoins[0], vec],
        })
      }
      transferOrDestoryCoin(txb, targetCoins[0], targetCoinType, this.config)
    }

    return txb
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

  async devInspectTransactionBlock(txb: Transaction, signer: Signer) {
    const res = await this.client.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: signer.getPublicKey().toSuiAddress(),
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
}

function parseRouterResponse(data: any): RouterData {
  return {
    amountIn: new BN(data.amount_in.toString()),
    amountOut: new BN(data.amount_out.toString()),
    routes: data.routes.map((route: any) => {
      return {
        path: route.path.map((path: any) => {
          let version
          if (path.provider === AFTERMATH_AMM) {
            version =
              path.extended_details.aftermath_pool_flatness === 0 ? "v2" : "v3"
          }
          return {
            id: path.id,
            a2b: path.direction,
            provider: path.provider,
            from: path.from,
            target: path.target,
            feeRate: path.fee_rate,
            amountIn: path.amount_in,
            amountOut: path.amount_out,
            extendedDetails: {
              aftermathLpSupplyType:
                path.extended_details.aftermath_lp_supply_type,
              turbosFeeType: path.extended_details.turbos_fee_type,
            },
            version,
          }
        }),
        amountIn: new BN(route.amount_in.toString()),
        amountOut: new BN(route.amount_out.toString()),
        initialPrice: new Decimal(route.initial_price.toString()),
      }
    }),
  }
}
