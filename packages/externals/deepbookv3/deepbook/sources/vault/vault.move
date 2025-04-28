// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The vault holds all of the assets for this pool. At the end of all
/// transaction processing, the vault is used to settle the balances for the user.
module deepbookv3::vault;

use deepbookv3::balance_manager::{TradeProof, BalanceManager};
use deepbookv3::balances::Balances;
use std::type_name::{Self, TypeName};
use sui::balance::{Self, Balance};
use sui::coin::Coin;
use sui::event;
use token::deep::DEEP;

// === Errors ===
const ENotEnoughBaseForLoan: u64 = 1;
const ENotEnoughQuoteForLoan: u64 = 2;
const EInvalidLoanQuantity: u64 = 3;
const EIncorrectLoanPool: u64 = 4;
const EIncorrectTypeReturned: u64 = 5;
const EIncorrectQuantityReturned: u64 = 6;

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
