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

import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import BN from "bn.js"

export interface SwapContext {
  quoteID: string
  fromCoinType: string
  targetCoinType: string
  expectAmountOut: string | BN | bigint
  amountOutLimit: string | BN | bigint
  inputCoin: TransactionObjectArgument
  feeRate: string | BN | bigint | number
  feeRecipient: string
  aggregatorPublishedAt?: string
  packages?: Map<string, string>
}

import * as Constants from "../const"

const defaultAggregatorV3PublishedAt =
  Constants.AGGREGATOR_V3_CONFIG.DEFAULT_PUBLISHED_AT.Mainnet

/**
 * Get aggregator published address with fallback priority:
 * 1. From packages map using AGGREGATOR_V3 key
 * 2. From aggregatorPublishedAt parameter
 * 3. Default published address
 */
function getAggregatorPublishedAt(
  packages?: Map<string, string>,
  aggregatorPublishedAt?: string
): string {
  if (packages && packages.has(Constants.PACKAGE_NAMES.AGGREGATOR_V3)) {
    return packages.get(Constants.PACKAGE_NAMES.AGGREGATOR_V3)!
  }
  return aggregatorPublishedAt || defaultAggregatorV3PublishedAt
}

export function newSwapContext(
  params: SwapContext,
  txb: Transaction
): TransactionObjectArgument {
  const {
    quoteID,
    fromCoinType,
    targetCoinType,
    expectAmountOut,
    amountOutLimit,
    inputCoin,
    feeRate,
    feeRecipient,
    aggregatorPublishedAt,
    packages,
  } = params

  // Get published address from packages first, then fallback to aggregatorPublishedAt, then default
  const publishedAt = getAggregatorPublishedAt(packages, aggregatorPublishedAt)

  const args = [
    txb.pure.string(quoteID),
    txb.pure.u64(expectAmountOut.toString()),
    txb.pure.u64(amountOutLimit.toString()),
    inputCoin,
    txb.pure.u32(Number(feeRate.toString())),
    txb.pure.address(feeRecipient),
  ]

  const swap_context = txb.moveCall({
    target: `${publishedAt}::router::new_swap_context`,
    typeArguments: [fromCoinType, targetCoinType],
    arguments: args,
  }) as TransactionObjectArgument
  return swap_context
}

export interface ConfirmSwapContext {
  swapContext: TransactionObjectArgument
  targetCoinType: string
  aggregatorPublishedAt?: string
  packages?: Map<string, string>
}

export function confirmSwap(
  params: ConfirmSwapContext,
  txb: Transaction
): TransactionObjectArgument {
  const { swapContext, targetCoinType, aggregatorPublishedAt, packages } =
    params

  // Get published address from packages first, then fallback to aggregatorPublishedAt, then default
  const publishedAt = getAggregatorPublishedAt(packages, aggregatorPublishedAt)

  const targetCoin = txb.moveCall({
    target: `${publishedAt}::router::confirm_swap`,
    typeArguments: [targetCoinType],
    arguments: [swapContext],
  }) as TransactionObjectArgument
  return targetCoin
}

export interface TakeBalanceContext {
  coinType: string
  amount: number | string | BN | bigint
  swapCtx: TransactionObjectArgument
  aggregatorPublishedAt?: string
  packages?: Map<string, string>
}

export function takeBalance(
  params: TakeBalanceContext,
  txb: Transaction
): TransactionObjectArgument {
  const { coinType, amount, swapCtx, aggregatorPublishedAt, packages } = params
  // Get published address from packages first, then fallback to aggregatorPublishedAt, then default
  const publishedAt = getAggregatorPublishedAt(packages, aggregatorPublishedAt)
  const args = [swapCtx, txb.pure.u64(amount.toString())]
  const targetCoin = txb.moveCall({
    target: `${publishedAt}::router::take_balance`,
    typeArguments: [coinType],
    arguments: args,
  }) as TransactionObjectArgument
  return targetCoin
}

export interface TransferBalanceContext {
  balance: TransactionObjectArgument
  coinType: string
  recipient: string
  aggregatorPublishedAt?: string
  packages?: Map<string, string>
}

export function transferBalance(
  params: TransferBalanceContext,
  txb: Transaction
) {
  const { balance, coinType, recipient, aggregatorPublishedAt, packages } =
    params
  const publishedAt = getAggregatorPublishedAt(packages, aggregatorPublishedAt)
  const args = [balance, txb.pure.address(recipient)]
  txb.moveCall({
    target: `${publishedAt}::router::transfer_balance`,
    typeArguments: [coinType],
    arguments: args,
  })
}

export interface TransferOrDestroyCoinContext {
  coin: TransactionObjectArgument
  coinType: string
  aggregatorPublishedAt?: string
  packages?: Map<string, string>
}

export function transferOrDestroyCoin(
  params: TransferOrDestroyCoinContext,
  txb: Transaction
): void {
  const { coin, coinType, aggregatorPublishedAt, packages } = params

  // Get published address from packages first, then fallback to aggregatorPublishedAt, then default
  const publishedAt = getAggregatorPublishedAt(packages, aggregatorPublishedAt)

  txb.moveCall({
    target: `${publishedAt}::router::transfer_or_destroy_coin`,
    typeArguments: [coinType],
    arguments: [coin],
  })
}
