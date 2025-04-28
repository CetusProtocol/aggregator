// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// `Fill` struct represents the results of a match between two orders.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::fill;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::deep_price::OrderDeepPrice;

// === Structs ===
/// Fill struct represents the results of a match between two orders.
/// It is used to update the state.
public struct Fill has copy, drop, store {
    // ID of the maker order
    maker_order_id: u128,
    // Client Order ID of the maker order
    maker_client_order_id: u64,
    // Execution price
    execution_price: u64,
    // account_id of the maker order
    balance_manager_id: ID,
    // Whether the maker order is expired
    expired: bool,
    // Whether the maker order is fully filled
    completed: bool,
    // Original maker quantity
    original_maker_quantity: u64,
    // Quantity filled
    base_quantity: u64,
    // Quantity of quote currency filled
    quote_quantity: u64,
    // Whether the taker is bid
    taker_is_bid: bool,
    // Maker epoch
    maker_epoch: u64,
    // Maker deep price
    maker_deep_price: OrderDeepPrice,
    // Taker fee paid for fill
    taker_fee: u64,
    // Whether taker_fee is DEEP
    taker_fee_is_deep: bool,
    // Maker fee paid for fill
    maker_fee: u64,
    // Whether maker_fee is DEEP
    maker_fee_is_deep: bool,
}

// === Public-View Functions ===
public fun maker_order_id(self: &Fill): u128 {
    abort 0
}

public fun maker_client_order_id(self: &Fill): u64 {
    abort 0
}

public fun execution_price(self: &Fill): u64 {
    abort 0
}

public fun balance_manager_id(self: &Fill): ID {
    abort 0
}

public fun expired(self: &Fill): bool {
    abort 0
}

public fun completed(self: &Fill): bool {
    abort 0
}

public fun original_maker_quantity(self: &Fill): u64 {
    abort 0
}

public fun base_quantity(self: &Fill): u64 {
    abort 0
}

public fun taker_is_bid(self: &Fill): bool {
    abort 0
}

public fun quote_quantity(self: &Fill): u64 {
    abort 0
}

public fun maker_epoch(self: &Fill): u64 {
    abort 0
}

public fun maker_deep_price(self: &Fill): OrderDeepPrice {
    abort 0
}

public fun taker_fee(self: &Fill): u64 {
    abort 0
}

public fun taker_fee_is_deep(self: &Fill): bool {
    abort 0
}

public fun maker_fee(self: &Fill): u64 {
    abort 0
}

public fun maker_fee_is_deep(self: &Fill): bool {
    abort 0
}

// === Public-Package Functions ===
public(package) fun new(
    maker_order_id: u128,
    maker_client_order_id: u64,
    execution_price: u64,
    balance_manager_id: ID,
    expired: bool,
    completed: bool,
    original_maker_quantity: u64,
    base_quantity: u64,
    quote_quantity: u64,
    taker_is_bid: bool,
    maker_epoch: u64,
    maker_deep_price: OrderDeepPrice,
    taker_fee_is_deep: bool,
    maker_fee_is_deep: bool,
): Fill {
    abort 0
}

/// Calculate the quantities to settle for the maker.
public(package) fun get_settled_maker_quantities(self: &Fill): Balances {
    abort 0
}

public(package) fun set_fill_maker_fee(self: &mut Fill, fee: &Balances) {
    abort 0
}

public(package) fun set_fill_taker_fee(self: &mut Fill, fee: &Balances) {
    abort 0
}
