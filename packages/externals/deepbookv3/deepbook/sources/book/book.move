// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// The book module contains the `Book` struct which represents the order book.
/// All order book operations are defined in this module.
#[allow(unused_field)]
module deepbookv3::book;

use deepbookv3::big_vector::BigVector;
use deepbookv3::deep_price::OrderDeepPrice;
use deepbookv3::order::Order;
use deepbookv3::order_info::OrderInfo;

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
    &self.bids
}

public(package) fun asks(self: &Book): &BigVector<Order> {
    &self.asks
}

public(package) fun tick_size(self: &Book): u64 {
    self.tick_size
}

public(package) fun lot_size(self: &Book): u64 {
    self.lot_size
}

public(package) fun min_size(self: &Book): u64 {
    self.min_size
}

// ... existing code ...

public(package) fun empty(
    _tick_size: u64,
    _lot_size: u64,
    _min_size: u64,
    _ctx: &mut TxContext,
): Book {
    abort 0
}

public(package) fun create_order(
    _self: &mut Book,
    _order_info: &mut OrderInfo,
    _timestamp: u64,
) {
    abort 0
}

public(package) fun get_quantity_out(
    _self: &Book,
    _base_quantity: u64,
    _quote_quantity: u64,
    _taker_fee: u64,
    _deep_price: OrderDeepPrice,
    _lot_size: u64,
    _current_timestamp: u64,
): (u64, u64, u64) {
    abort 0
}

public(package) fun cancel_order(
    _self: &mut Book,
    _order_id: u128,
): Order {
    abort 0
}

public(package) fun modify_order(
    _self: &mut Book,
    _order_id: u128,
    _new_quantity: u64,
    _timestamp: u64,
): (u64, &Order) {
    abort 0
}

public(package) fun mid_price(
    _self: &Book,
    _current_timestamp: u64,
): u64 {
    abort 0
}

public(package) fun get_level2_range_and_ticks(
    _self: &Book,
    _price_low: u64,
    _price_high: u64,
    _ticks: u64,
    _is_bid: bool,
    _current_timestamp: u64,
): (vector<u64>, vector<u64>) {
    abort 0
}

public(package) fun get_order(
    _self: &Book,
    _order_id: u128,
): Order {
    abort 0
}
