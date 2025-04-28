// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The BalanceManager is a shared object that holds all of the balances for different assets. A combination of `BalanceManager` and
/// `TradeProof` are passed into a pool to perform trades. A `TradeProof` can be generated in two ways: by the
/// owner directly, or by any `TradeCap` owner. The owner can generate a `TradeProof` without the risk of
/// equivocation. The `TradeCap` owner, due to it being an owned object, risks equivocation when generating
/// a `TradeProof`. Generally, a high frequency trading engine will trade as the default owner.
module deepbookv3::balance_manager;

use std::type_name::{Self, TypeName};
use sui::bag::{Self, Bag};
use sui::balance::{Self, Balance};
use sui::coin::Coin;
use sui::event;
use sui::vec_set::{Self, VecSet};

// === Errors ===
const EInvalidOwner: u64 = 0;
const EInvalidTrader: u64 = 1;
const EInvalidProof: u64 = 2;
const EBalanceManagerBalanceTooLow: u64 = 3;
const EMaxCapsReached: u64 = 4;
const ECapNotInList: u64 = 5;

// === Constants ===
const MAX_TRADE_CAPS: u64 = 1000;

// === Structs ===
/// A shared object that is passed into pools for placing orders.
public struct BalanceManager has key, store {
    id: UID,
    owner: address,
    balances: Bag,
    allow_listed: VecSet<ID>,
}

/// Event emitted when a new balance_manager is created.
public struct BalanceManagerEvent has copy, drop {
    balance_manager_id: ID,
    owner: address,
}

/// Event emitted when a deposit or withdrawal occurs.
public struct BalanceEvent has copy, drop {
    balance_manager_id: ID,
    asset: TypeName,
    amount: u64,
    deposit: bool,
}

/// Balance identifier.
public struct BalanceKey<phantom T> has copy, drop, store {}

/// Owners of a `TradeCap` need to get a `TradeProof` to trade across pools in a single PTB (drops after).
public struct TradeCap has key, store {
    id: UID,
    balance_manager_id: ID,
}

/// `DepositCap` is used to deposit funds to a balance_manager by a non-owner.
public struct DepositCap has key, store {
    id: UID,
    balance_manager_id: ID,
}

/// WithdrawCap is used to withdraw funds from a balance_manager by a non-owner.
public struct WithdrawCap has key, store {
    id: UID,
    balance_manager_id: ID,
}

/// BalanceManager owner and `TradeCap` owners can generate a `TradeProof`.
/// `TradeProof` is used to validate the balance_manager when trading on DeepBook.
public struct TradeProof has drop {
    balance_manager_id: ID,
    trader: address,
}

// === Public-Mutative Functions ===
public fun new(ctx: &mut TxContext): BalanceManager {
    abort 0
}

/// Create a new balance manager with an owner.
public fun new_with_owner(ctx: &mut TxContext, owner: address): BalanceManager {
    abort 0
}

/// Returns the balance of a Coin in a balance manager.
public fun balance<T>(balance_manager: &BalanceManager): u64 {
    abort 0
}

/// Mint a `TradeCap`, only owner can mint a `TradeCap`.
public fun mint_trade_cap(balance_manager: &mut BalanceManager, ctx: &mut TxContext): TradeCap {
    abort 0
}

/// Mint a `DepositCap`, only owner can mint.
public fun mint_deposit_cap(balance_manager: &mut BalanceManager, ctx: &mut TxContext): DepositCap {
    abort 0
}

/// Mint a `WithdrawCap`, only owner can mint.
public fun mint_withdraw_cap(
    balance_manager: &mut BalanceManager,
    ctx: &mut TxContext,
): WithdrawCap {
    abort 0
}

/// Revoke a `TradeCap`. Only the owner can revoke a `TradeCap`.
/// Can also be used to revoke `DepositCap` and `WithdrawCap`.
public fun revoke_trade_cap(
    balance_manager: &mut BalanceManager,
    trade_cap_id: &ID,
    ctx: &TxContext,
) {
    abort 0
}

/// Generate a `TradeProof` by the owner. The owner does not require a capability
/// and can generate TradeProofs without the risk of equivocation.
public fun generate_proof_as_owner(
    balance_manager: &mut BalanceManager,
    ctx: &TxContext,
): TradeProof {
    abort 0
}

/// Generate a `TradeProof` with a `TradeCap`.
/// Risk of equivocation since `TradeCap` is an owned object.
public fun generate_proof_as_trader(
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    ctx: &TxContext,
): TradeProof {
    abort 0
}

/// Deposit funds to a balance manager. Only owner can call this directly.
public fun deposit<T>(balance_manager: &mut BalanceManager, coin: Coin<T>, ctx: &mut TxContext) {
    abort 0
}

/// Deposit funds into a balance manager by a `DepositCap` owner.
public fun deposit_with_cap<T>(
    balance_manager: &mut BalanceManager,
    deposit_cap: &DepositCap,
    coin: Coin<T>,
    ctx: &TxContext,
) {
    abort 0
}

/// Withdraw funds from a balance manager by a `WithdrawCap` owner.
public fun withdraw_with_cap<T>(
    balance_manager: &mut BalanceManager,
    withdraw_cap: &WithdrawCap,
    withdraw_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    abort 0
}

/// Withdraw funds from a balance_manager. Only owner can call this directly.
/// If withdraw_all is true, amount is ignored and full balance withdrawn.
/// If withdraw_all is false, withdraw_amount will be withdrawn.
public fun withdraw<T>(
    balance_manager: &mut BalanceManager,
    withdraw_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    abort 0
}

public fun withdraw_all<T>(balance_manager: &mut BalanceManager, ctx: &mut TxContext): Coin<T> {
    abort 0
}

public fun validate_proof(balance_manager: &BalanceManager, proof: &TradeProof) {
    abort 0
}

/// Returns the owner of the balance_manager.
public fun owner(balance_manager: &BalanceManager): address {
    abort 0
}

/// Returns the owner of the balance_manager.
public fun id(balance_manager: &BalanceManager): ID {
    abort 0
}
