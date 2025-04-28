// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The book module contains the `Book` struct which represents the order book.
/// All order book operations are defined in this module.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::book;

use deepbookv3::big_vector::{Self, BigVector};
use deepbookv3::constants;
use deepbookv3::deep_price::OrderDeepPrice;
use deepbookv3::order::Order;
use deepbookv3::order_info::OrderInfo;

// === Errors ===
const EInvalidAmountIn: u64 = 1;
const EEmptyOrderbook: u64 = 2;
const EInvalidPriceRange: u64 = 3;
const EInvalidTicks: u64 = 4;
const EOrderBelowMinimumSize: u64 = 5;
const EOrderInvalidLotSize: u64 = 6;
const ENewQuantityMustBeLessThanOriginal: u64 = 7;

// === Constants ===
const START_BID_ORDER_ID: u64 = ((1u128 << 64) - 1) as u64;
const START_ASK_ORDER_ID: u64 = 1;

// === Structs ===
public struct Book has store {
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    bids: BigVector<Order>,
    asks: BigVector<Order>,
    next_bid_order_id: u64,
    next_ask_order_id: u64,
}

// === Public-Package Functions ===
public(package) fun bids(self: &Book): &BigVector<Order> {
    abort 0
}

public(package) fun asks(self: &Book): &BigVector<Order> {
    abort 0
}

public(package) fun tick_size(self: &Book): u64 {
    abort 0
}

public(package) fun lot_size(self: &Book): u64 {
    abort 0
}

public(package) fun min_size(self: &Book): u64 {
    abort 0
}

public(package) fun empty(tick_size: u64, lot_size: u64, min_size: u64, ctx: &mut TxContext): Book {
    abort 0
}

/// Creates a new order.
/// Order is matched against the book and injected into the book if necessary.
/// If order is IOC or fully executed, it will not be injected.
public(package) fun create_order(self: &mut Book, order_info: &mut OrderInfo, timestamp: u64) {
    abort 0
}

/// Given base_quantity and quote_quantity, calculate the base_quantity_out and
/// quote_quantity_out.
/// Will return (base_quantity_out, quote_quantity_out, deep_quantity_required)
/// if base_amount > 0 or quote_amount > 0.
public(package) fun get_quantity_out(
    self: &Book,
    base_quantity: u64,
    quote_quantity: u64,
    taker_fee: u64,
    deep_price: OrderDeepPrice,
    lot_size: u64,
    pay_with_deep: bool,
    current_timestamp: u64,
): (u64, u64, u64) {
    abort 0
}

/// Cancels an order given order_id
public(package) fun cancel_order(self: &mut Book, order_id: u128): Order {
    abort 0
}

/// Modifies an order given order_id and new_quantity.
/// New quantity must be less than the original quantity.
/// Order must not have already expired.
public(package) fun modify_order(
    self: &mut Book,
    order_id: u128,
    new_quantity: u64,
    timestamp: u64,
): (u64, &Order) {
    abort 0
}

/// Returns the mid price of the order book.
public(package) fun mid_price(self: &Book, current_timestamp: u64): u64 {
    abort 0
}

/// Returns the best bids and asks.
/// The number of ticks is the number of price levels to return.
/// The price_low and price_high are the range of prices to return.
public(package) fun get_level2_range_and_ticks(
    self: &Book,
    price_low: u64,
    price_high: u64,
    ticks: u64,
    is_bid: bool,
    current_timestamp: u64,
): (vector<u64>, vector<u64>) {
    abort 0
}

public(package) fun get_order(self: &Book, order_id: u128): Order {
    abort 0
}

public(package) fun set_tick_size(self: &mut Book, new_tick_size: u64) {
    abort 0
}

public(package) fun set_lot_size(self: &mut Book, new_lot_size: u64) {
    abort 0
}

public(package) fun set_min_size(self: &mut Book, new_min_size: u64) {
    abort 0
}

// === Private Functions ===
// Access side of book where order_id belongs
fun book_side_mut(self: &mut Book, order_id: u128): &mut BigVector<Order> {
    abort 0
}

fun book_side(self: &Book, order_id: u128): &BigVector<Order> {
    abort 0
}

/// Matches the given order and quantity against the order book.
/// If is_bid, it will match against asks, otherwise against bids.
/// Mutates the order and the maker order as necessary.
fun match_against_book(self: &mut Book, order_info: &mut OrderInfo, timestamp: u64) {
    abort 0
}

fun get_order_id(self: &mut Book, is_bid: bool): u64 {
    abort 0
}

/// Balance accounting happens before this function is called
fun inject_limit_order(self: &mut Book, order_info: &OrderInfo) {
    abort 0
}
