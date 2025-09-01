// Copyright 2025 0xBondSui <sugar@cetus.zone>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import BN from "bn.js"
import {
  TransactionObjectArgument,
  Transaction,
} from "@mysten/sui/transactions"
import { Router, RouterData } from "./types/shared"

export type BuildRouterSwapParams = {
  routers: Router[]
  byAmountIn: boolean
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
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
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  refreshAllCoins?: boolean
  payDeepFeeAmount?: number
}

export type BuildRouterSwapParamsV2 = {
  routers: RouterData
  inputCoin: TransactionObjectArgument
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  // This parameter is used to pass the Deep token object. When using the DeepBook V3 provider,
  // users must pay fees with Deep tokens in non-whitelisted pools.
  deepbookv3DeepFee?: TransactionObjectArgument
}

export type BuildFastRouterSwapParamsV2 = {
  routers: RouterData
  slippage: number
  txb: Transaction
  // @deprecated Partner parameter in constructor is deprecated. The partner parameter in swap methods will take precedence if both are set.
  partner?: string
  refreshAllCoins?: boolean
  payDeepFeeAmount?: number
}

export interface PythConfig {
  wormholeStateId: string
  pythStateId: string
}
