// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// This module defines the OrderPage struct and its methods to iterate over orders in a pool.
#[allow(unused_field)]
module deepbookv3::order_query;

use deepbookv3::order::Order;
use deepbookv3::pool::Pool;

// === Structs ===
public struct OrderPage has drop {
    orders: vector<Order>,
    has_next_page: bool,
}

// === Public Functions ===
/// Bid minimum order id has 0 for its first bit, 0 for next 63 bits for price, and 1 for next 64 bits for order id.
/// Ask minimum order id has 1 for its first bit, 0 for next 63 bits for price, and 0 for next 64 bits for order id.
/// Bids are iterated from high to low order id, and asks are iterated from low to high order id.
public fun iter_orders<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _start_order_id: Option<u128>,
    _end_order_id: Option<u128>,
    _min_expire_timestamp: Option<u64>,
    _limit: u64,
    _bids: bool,
): OrderPage {
    abort 0
}

public fun orders(_self: &OrderPage): &vector<Order> {
    abort 0
}

public fun has_next_page(_self: &OrderPage): bool {
    abort 0
}
