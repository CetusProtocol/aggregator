// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Order module defines the order struct and its methods.
/// All order matching happens in this module.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::order;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::constants;
use deepbookv3::deep_price::OrderDeepPrice;
use deepbookv3::fill::{Self, Fill};
use sui::event;

// === Errors ===
const EInvalidNewQuantity: u64 = 0;
const EOrderExpired: u64 = 1;

// === Structs ===
/// Order struct represents the order in the order book. It is optimized for space.
public struct Order has drop, store {
    balance_manager_id: ID,
    order_id: u128,
    client_order_id: u64,
    quantity: u64,
    filled_quantity: u64,
    fee_is_deep: bool,
    order_deep_price: OrderDeepPrice,
    epoch: u64,
    status: u8,
    expire_timestamp: u64,
}

/// Emitted when a maker order is canceled.
public struct OrderCanceled has copy, drop, store {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    original_quantity: u64,
    base_asset_quantity_canceled: u64,
    timestamp: u64,
}

/// Emitted when a maker order is modified.
public struct OrderModified has copy, drop, store {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    previous_quantity: u64,
    filled_quantity: u64,
    new_quantity: u64,
    timestamp: u64,
}

// === Public-View Functions ===
public fun balance_manager_id(self: &Order): ID {
    abort 0
}

public fun order_id(self: &Order): u128 {
    abort 0
}

public fun client_order_id(self: &Order): u64 {
    abort 0
}

public fun quantity(self: &Order): u64 {
    abort 0
}

public fun filled_quantity(self: &Order): u64 {
    abort 0
}

public fun fee_is_deep(self: &Order): bool {
    abort 0
}

public fun order_deep_price(self: &Order): &OrderDeepPrice {
    abort 0
}

public fun epoch(self: &Order): u64 {
    abort 0
}

public fun status(self: &Order): u8 {
    abort 0
}

public fun expire_timestamp(self: &Order): u64 {
    abort 0
}

public fun price(self: &Order): u64 {
    abort 0
}

// === Public-Package Functions ===
/// initialize the order struct.
public(package) fun new(
    order_id: u128,
    balance_manager_id: ID,
    client_order_id: u64,
    quantity: u64,
    filled_quantity: u64,
    fee_is_deep: bool,
    order_deep_price: OrderDeepPrice,
    epoch: u64,
    status: u8,
    expire_timestamp: u64,
): Order {
    abort 0
}

/// Generate a fill for the resting order given the timestamp,
/// quantity and whether the order is a bid.
public(package) fun generate_fill(
    self: &mut Order,
    timestamp: u64,
    quantity: u64,
    is_bid: bool,
    expire_maker: bool,
    taker_fee_is_deep: bool,
): Fill {
    abort 0
}

/// Modify the order with a new quantity. The new quantity must be greater
/// than the filled quantity and less than the original quantity. The
/// timestamp must be less than the expire timestamp.
public(package) fun modify(self: &mut Order, new_quantity: u64, timestamp: u64) {
    abort 0
}

/// Calculate the refund for a canceled order. The refund is any
/// unfilled quantity and the maker fee. If the cancel quantity is
/// not provided, the remaining quantity is used. Cancel quantity is
/// provided when modifying an order, so that the refund can be calculated
/// based on the quantity that's reduced.
public(package) fun calculate_cancel_refund(
    self: &Order,
    maker_fee: u64,
    cancel_quantity: Option<u64>,
): Balances {
    abort 0
}

public(package) fun locked_balance(self: &Order, maker_fee: u64): Balances {
    abort 0
}

public(package) fun emit_order_canceled(
    self: &Order,
    pool_id: ID,
    trader: address,
    timestamp: u64,
) {
    abort 0
}

public(package) fun emit_order_modified(
    self: &Order,
    pool_id: ID,
    previous_quantity: u64,
    trader: address,
    timestamp: u64,
) {
    abort 0
}

public(package) fun emit_cancel_maker(
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    original_quantity: u64,
    base_asset_quantity_canceled: u64,
    timestamp: u64,
) {
    abort 0
}

/// Copy the order struct.
public(package) fun copy_order(order: &Order): Order {
    abort 0
}

/// Update the order status to canceled.
public(package) fun set_canceled(self: &mut Order) {
    abort 0
}

public(package) fun is_bid(self: &Order): bool {
    abort 0
}
