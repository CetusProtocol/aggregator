// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Order module defines the order struct and its methods.
/// All order matching happens in this module.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::order_info;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::constants;
use deepbookv3::deep_price::OrderDeepPrice;
use deepbookv3::fill::Fill;
use deepbookv3::order::{Self, Order};
use sui::event;

// === Errors ===
const EOrderInvalidPrice: u64 = 0;
const EOrderBelowMinimumSize: u64 = 1;
const EOrderInvalidLotSize: u64 = 2;
const EInvalidExpireTimestamp: u64 = 3;
const EInvalidOrderType: u64 = 4;
const EPOSTOrderCrossesOrderbook: u64 = 5;
const EFOKOrderCannotBeFullyFilled: u64 = 6;
const EMarketOrderCannotBePostOnly: u64 = 7;
const ESelfMatchingCancelTaker: u64 = 8;

// === Structs ===
/// OrderInfo struct represents all order information.
/// This objects gets created at the beginning of the order lifecycle and
/// gets updated until it is completed or placed in the book.
/// It is returned at the end of the order lifecycle.
public struct OrderInfo has copy, drop, store {
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
public struct OrderFilled has copy, drop, store {
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
public struct OrderPlaced has copy, drop, store {
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
public struct OrderExpired has copy, drop, store {
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
    abort 0
}

public fun order_id(self: &OrderInfo): u128 {
    abort 0
}

public fun balance_manager_id(self: &OrderInfo): ID {
    abort 0
}

public fun client_order_id(self: &OrderInfo): u64 {
    abort 0
}

public fun trader(self: &OrderInfo): address {
    abort 0
}

public fun order_type(self: &OrderInfo): u8 {
    abort 0
}

public fun self_matching_option(self: &OrderInfo): u8 {
    abort 0
}

public fun price(self: &OrderInfo): u64 {
    abort 0
}

public fun is_bid(self: &OrderInfo): bool {
    abort 0
}

public fun original_quantity(self: &OrderInfo): u64 {
    abort 0
}

public fun order_deep_price(self: &OrderInfo): OrderDeepPrice {
    abort 0
}

public fun expire_timestamp(self: &OrderInfo): u64 {
    abort 0
}

public fun executed_quantity(self: &OrderInfo): u64 {
    abort 0
}

public fun cumulative_quote_quantity(self: &OrderInfo): u64 {
    abort 0
}

public fun fills(self: &OrderInfo): vector<Fill> {
    abort 0
}

public fun fee_is_deep(self: &OrderInfo): bool {
    abort 0
}

public fun paid_fees(self: &OrderInfo): u64 {
    abort 0
}

public fun maker_fees(self: &OrderInfo): u64 {
    abort 0
}

public fun epoch(self: &OrderInfo): u64 {
    abort 0
}

public fun status(self: &OrderInfo): u8 {
    abort 0
}

public fun fill_limit_reached(self: &OrderInfo): bool {
    abort 0
}

public fun order_inserted(self: &OrderInfo): bool {
    abort 0
}

// === Public-Package Functions ===
public(package) fun new(
    pool_id: ID,
    balance_manager_id: ID,
    client_order_id: u64,
    trader: address,
    order_type: u8,
    self_matching_option: u8,
    price: u64,
    quantity: u64,
    is_bid: bool,
    fee_is_deep: bool,
    epoch: u64,
    expire_timestamp: u64,
    order_deep_price: OrderDeepPrice,
    market_order: bool,
    timestamp: u64,
): OrderInfo {
    abort 0
}

public(package) fun market_order(self: &OrderInfo): bool {
    abort 0
}

public(package) fun set_order_id(self: &mut OrderInfo, order_id: u128) {
    abort 0
}

public(package) fun set_paid_fees(self: &mut OrderInfo, paid_fees: u64) {
    abort 0
}

public(package) fun add_fill(self: &mut OrderInfo, fill: Fill) {
    abort 0
}

public(package) fun fills_ref(self: &mut OrderInfo): &mut vector<Fill> {
    abort 0
}

public(package) fun paid_fees_balances(self: &OrderInfo): Balances {
    abort 0
}

/// Given a partially filled `OrderInfo`, the taker fee and maker fee, for the user
/// placing the order, calculate all of the balances that need to be settled and
/// the balances that are owed. The executed quantity is multiplied by the taker_fee
/// and the remaining quantity is multiplied by the maker_fee to get the DEEP fee.
public(package) fun calculate_partial_fill_balances(
    self: &mut OrderInfo,
    taker_fee: u64,
    maker_fee: u64,
): (Balances, Balances) {
    abort 0
}

/// `OrderInfo` is converted to an `Order` before being injected into the order book.
/// This is done to save space in the order book. Order contains the minimum
/// information required to match orders.
public(package) fun to_order(self: &OrderInfo): Order {
    abort 0
}

/// Validates that the initial order created meets the pool requirements.
public(package) fun validate_inputs(
    order_info: &OrderInfo,
    tick_size: u64,
    min_size: u64,
    lot_size: u64,
    timestamp: u64,
) {
    abort 0
}

/// Assert order types after partial fill against the order book.
public(package) fun assert_execution(self: &mut OrderInfo): bool {
    abort 0
}

/// Returns the remaining quantity for the order.
public(package) fun remaining_quantity(self: &OrderInfo): u64 {
    abort 0
}

/// Returns true if two opposite orders are overlapping in price.
public(package) fun can_match(self: &OrderInfo, order: &Order): bool {
    abort 0
}

/// Matches an `OrderInfo` with an `Order` from the book. Appends a `Fill` to fills.
/// If the book order is expired, the `Fill` will have the expired flag set to true.
/// Funds for the match or an expired order are returned to the maker as settled.
public(package) fun match_maker(self: &mut OrderInfo, maker: &mut Order, timestamp: u64): bool {
    abort 0
}

/// Emit all fills for this order in a vector of `OrderFilled` events.
/// To avoid DOS attacks, 100 fills are emitted at a time. Up to 10,000
/// fills can be emitted in a single call.
public(package) fun emit_orders_filled(self: &OrderInfo, timestamp: u64) {
    abort 0
}

public(package) fun emit_order_placed(self: &OrderInfo) {
    abort 0
}

public(package) fun emit_order_info(self: &OrderInfo) {
    abort 0
}

public(package) fun set_fill_limit_reached(self: &mut OrderInfo) {
    abort 0
}

public(package) fun set_order_inserted(self: &mut OrderInfo) {
    abort 0
}

// === Private Functions ===
fun order_filled_from_fill(self: &OrderInfo, fill: &Fill, timestamp: u64): OrderFilled {
    abort 0
}

fun order_expired_from_fill(self: &OrderInfo, fill: &Fill, timestamp: u64): OrderExpired {
    abort 0
}

fun emit_order_canceled_maker_from_fill(self: &OrderInfo, fill: &Fill, timestamp: u64) {
    abort 0
}
