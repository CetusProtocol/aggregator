// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The vault holds all of the assets for this pool. At the end of all
/// transaction processing, the vault is used to settle the balances for the user.
#[allow(unused_field)]
module deepbookv3::vault;

use deepbookv3::balance_manager::{TradeProof, BalanceManager};
use deepbookv3::balances::Balances;
use std::type_name::TypeName;
use sui::balance::Balance;
use sui::coin::Coin;
use token::deep::DEEP;

// === Structs ===
public struct Vault<phantom BaseAsset, phantom QuoteAsset> has store {
    base_balance: Balance<BaseAsset>,
    quote_balance: Balance<QuoteAsset>,
    deep_balance: Balance<DEEP>,
}

public struct FlashLoan {
    pool_id: ID,
    borrow_quantity: u64,
    type_name: TypeName,
}

public struct FlashLoanBorrowed has copy, drop {
    pool_id: ID,
    borrow_quantity: u64,
    type_name: TypeName,
}

// === Public-Package Functions ===
public(package) fun balances<BaseAsset, QuoteAsset>(
    _self: &Vault<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

public(package) fun empty<BaseAsset, QuoteAsset>(): Vault<
    BaseAsset,
    QuoteAsset,
> {
    abort 0
}

public(package) fun settle_balance_manager<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _balances_out: Balances,
    _balances_in: Balances,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
) {
    abort 0
}

public(package) fun withdraw_deep_to_burn<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _amount_to_burn: u64,
): Balance<DEEP> {
    abort 0
}

public(package) fun borrow_flashloan_base<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _pool_id: ID,
    _borrow_quantity: u64,
    _ctx: &mut TxContext,
): (Coin<BaseAsset>, FlashLoan) {
    abort 0
}

public(package) fun borrow_flashloan_quote<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _pool_id: ID,
    _borrow_quantity: u64,
    _ctx: &mut TxContext,
): (Coin<QuoteAsset>, FlashLoan) {
    abort 0
}

public(package) fun return_flashloan_base<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _pool_id: ID,
    _coin: Coin<BaseAsset>,
    _flash_loan: FlashLoan,
) {
    abort 0
}

public(package) fun return_flashloan_quote<BaseAsset, QuoteAsset>(
    _self: &mut Vault<BaseAsset, QuoteAsset>,
    _pool_id: ID,
    _coin: Coin<QuoteAsset>,
    _flash_loan: FlashLoan,
) {
    abort 0
}
