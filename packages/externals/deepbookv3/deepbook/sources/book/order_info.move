// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Order module defines the order struct and its methods.
/// All order matching happens in this module.
#[allow(unused_field)]
module deepbookv3::order_info;

use deepbookv3::balances::Balances;
use deepbookv3::deep_price::OrderDeepPrice;
use deepbookv3::fill::Fill;
use deepbookv3::order::Order;

// === Structs ===
/// OrderInfo struct represents all order information.
/// This objects gets created at the beginning of the order lifecycle and
/// gets updated until it is completed or placed in the book.
/// It is returned at the end of the order lifecycle.
public struct OrderInfo has store, drop, copy {
    // ID of the pool
    pool_id: ID,
    // ID of the order within the pool
    order_id: u128,
    // ID of the account the order uses
    balance_manager_id: ID,
    // ID of the order defined by client
    client_order_id: u64,
    // Trader of the order
    trader: address,
    // Order type, NO_RESTRICTION, IMMEDIATE_OR_CANCEL, FILL_OR_KILL, POST_ONLY
    order_type: u8,
    // Self matching option,
    self_matching_option: u8,
    // Price, only used for limit orders
    price: u64,
    // Whether the order is a buy or a sell
    is_bid: bool,
    // Quantity (in base asset terms) when the order is placed
    original_quantity: u64,
    // Deep conversion used by the order
    order_deep_price: OrderDeepPrice,
    // Expiration timestamp in ms
    expire_timestamp: u64,
    // Quantity executed so far
    executed_quantity: u64,
    // Cumulative quote quantity executed so far
    cumulative_quote_quantity: u64,
    // Any partial fills
    fills: vector<Fill>,
    // Whether the fee is in DEEP terms
    fee_is_deep: bool,
    // Fees paid so far in base/quote/DEEP terms for taker orders
    paid_fees: u64,
    // Fees transferred to pool vault but not yet paid for maker order
    maker_fees: u64,
    // Epoch this order was placed
    epoch: u64,
    // Status of the order
    status: u8,
    // Is a market_order
    market_order: bool,
    // Executed in one transaction
    fill_limit_reached: bool,
    // Whether order is inserted
    order_inserted: bool,
    // Order Timestamp
    timestamp: u64,
}

/// Emitted when a maker order is filled.
public struct OrderFilled has copy, store, drop {
    pool_id: ID,
    maker_order_id: u128,
    taker_order_id: u128,
    maker_client_order_id: u64,
    taker_client_order_id: u64,
    price: u64,
    taker_is_bid: bool,
    taker_fee: u64,
    taker_fee_is_deep: bool,
    maker_fee: u64,
    maker_fee_is_deep: bool,
    base_quantity: u64,
    quote_quantity: u64,
    maker_balance_manager_id: ID,
    taker_balance_manager_id: ID,
    timestamp: u64,
}

/// Emitted when a maker order is injected into the order book.
public struct OrderPlaced has copy, store, drop {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    placed_quantity: u64,
    expire_timestamp: u64,
    timestamp: u64,
}

/// Emitted when a maker order is expired.
public struct OrderExpired has copy, store, drop {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address, // trader that expired the order
    price: u64,
    is_bid: bool,
    original_quantity: u64,
    base_asset_quantity_canceled: u64,
    timestamp: u64,
}

// === Public-View Functions ===
public fun pool_id(self: &OrderInfo): ID {
    self.pool_id
}

public fun order_id(self: &OrderInfo): u128 {
    self.order_id
}

public fun balance_manager_id(self: &OrderInfo): ID {
    self.balance_manager_id
}

public fun client_order_id(self: &OrderInfo): u64 {
    self.client_order_id
}

public fun trader(self: &OrderInfo): address {
    self.trader
}

public fun order_type(self: &OrderInfo): u8 {
    self.order_type
}

public fun self_matching_option(self: &OrderInfo): u8 {
    self.self_matching_option
}

public fun price(self: &OrderInfo): u64 {
    self.price
}

public fun is_bid(self: &OrderInfo): bool {
    self.is_bid
}

public fun original_quantity(self: &OrderInfo): u64 {
    self.original_quantity
}

public fun order_deep_price(self: &OrderInfo): OrderDeepPrice {
    self.order_deep_price
}

public fun expire_timestamp(self: &OrderInfo): u64 {
    self.expire_timestamp
}

public fun executed_quantity(self: &OrderInfo): u64 {
    self.executed_quantity
}

public fun cumulative_quote_quantity(self: &OrderInfo): u64 {
    self.cumulative_quote_quantity
}

public fun fills(self: &OrderInfo): vector<Fill> {
    self.fills
}

public fun fee_is_deep(self: &OrderInfo): bool {
    self.fee_is_deep
}

public fun paid_fees(self: &OrderInfo): u64 {
    self.paid_fees
}

public fun maker_fees(self: &OrderInfo): u64 {
    self.maker_fees
}

public fun epoch(self: &OrderInfo): u64 {
    self.epoch
}

public fun status(self: &OrderInfo): u8 {
    self.status
}

public fun fill_limit_reached(self: &OrderInfo): bool {
    self.fill_limit_reached
}

public fun order_inserted(self: &OrderInfo): bool {
    self.order_inserted
}

// === Public-Package Functions ===
// ... existing code ...

public(package) fun new(
    _pool_id: ID,
    _balance_manager_id: ID,
    _client_order_id: u64,
    _trader: address,
    _order_type: u8,
    _self_matching_option: u8,
    _price: u64,
    _quantity: u64,
    _is_bid: bool,
    _fee_is_deep: bool,
    _epoch: u64,
    _expire_timestamp: u64,
    _order_deep_price: OrderDeepPrice,
    _market_order: bool,
    _timestamp: u64,
): OrderInfo {
    abort 0
}

public(package) fun market_order(_self: &OrderInfo): bool {
    abort 0
}

public(package) fun set_order_id(_self: &mut OrderInfo, _order_id: u128) {
    abort 0
}

public(package) fun set_paid_fees(_self: &mut OrderInfo, _paid_fees: u64) {
    abort 0
}

public(package) fun add_fill(_self: &mut OrderInfo, _fill: Fill) {
    abort 0
}

public(package) fun fills_ref(_self: &mut OrderInfo): &mut vector<Fill> {
    abort 0
}

public(package) fun calculate_partial_fill_balances(
    _self: &mut OrderInfo,
    _taker_fee: u64,
    _maker_fee: u64,
): (Balances, Balances) {
    abort 0
}

public(package) fun to_order(_self: &OrderInfo): Order {
    abort 0
}

public(package) fun validate_inputs(
    _order_info: &OrderInfo,
    _tick_size: u64,
    _min_size: u64,
    _lot_size: u64,
    _timestamp: u64,
) {
    abort 0
}

public(package) fun assert_execution(_self: &mut OrderInfo): bool {
    abort 0
}

public(package) fun remaining_quantity(_self: &OrderInfo): u64 {
    abort 0
}

public(package) fun can_match(_self: &OrderInfo, _order: &Order): bool {
    abort 0
}

public(package) fun match_maker(
    _self: &mut OrderInfo,
    _maker: &mut Order,
    _timestamp: u64,
): bool {
    abort 0
}

public(package) fun emit_orders_filled(_self: &OrderInfo, _timestamp: u64) {
    abort 0
}

public(package) fun emit_order_placed(_self: &OrderInfo) {
    abort 0
}

public(package) fun emit_order_info(_self: &OrderInfo) {
    abort 0
}

public(package) fun set_fill_limit_reached(_self: &mut OrderInfo) {
    abort 0
}

public(package) fun set_order_inserted(_self: &mut OrderInfo) {
    abort 0
}
