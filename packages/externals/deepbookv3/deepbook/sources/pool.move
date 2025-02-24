// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Public-facing interface for the package.
#[allow(unused_field, unused_type_parameter)]
module deepbookv3::pool;

use deepbookv3::account::Account;
use deepbookv3::balance_manager::{BalanceManager, TradeProof};
use deepbookv3::big_vector::BigVector;
use deepbookv3::book::Book;
use deepbookv3::deep_price::{
    DeepPrice
};
use deepbookv3::order::Order;
use deepbookv3::order_info::OrderInfo;
use deepbookv3::registry::{DeepbookAdminCap, Registry};
use deepbookv3::state::State;
use deepbookv3::vault::{Vault, FlashLoan};
use sui::clock::Clock;
use sui::coin::Coin;
use sui::vec_set::VecSet;
use sui::versioned::Versioned;
use token::deep::{DEEP, ProtectedTreasury};

// === Structs ===
public struct Pool<phantom BaseAsset, phantom QuoteAsset> has key {
    id: UID,
    inner: Versioned,
}

public struct PoolInner<phantom BaseAsset, phantom QuoteAsset> has store {
    allowed_versions: VecSet<u64>,
    pool_id: ID,
    book: Book,
    state: State,
    vault: Vault<BaseAsset, QuoteAsset>,
    deep_price: DeepPrice,
    registered_pool: bool,
}

public struct PoolCreated<
    phantom BaseAsset,
    phantom QuoteAsset,
> has copy, store, drop {
    pool_id: ID,
    taker_fee: u64,
    maker_fee: u64,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    whitelisted_pool: bool,
    treasury_address: address,
}

// === Public-Mutative Functions * EXCHANGE * ===
/// Place a limit order. Quantity is in base asset terms.
/// For current version pay_with_deep must be true, so the fee will be paid with DEEP tokens.
public fun place_limit_order<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _client_order_id: u64,
    _order_type: u8,
    _self_matching_option: u8,
    _price: u64,
    _quantity: u64,
    _is_bid: bool,
    _pay_with_deep: bool,
    _expire_timestamp: u64,
    _clock: &Clock,
    _ctx: &TxContext,
): OrderInfo {
    abort 0
}

/// Place a market order. Quantity is in base asset terms. Calls place_limit_order with
/// a price of MAX_PRICE for bids and MIN_PRICE for asks. Any quantity not filled is cancelled.
public fun place_market_order<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _client_order_id: u64,
    _self_matching_option: u8,
    _quantity: u64,
    _is_bid: bool,
    _pay_with_deep: bool,
    _clock: &Clock,
    _ctx: &TxContext,
): OrderInfo {
    abort 0
}

public fun swap_exact_base_for_quote<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _base_in: Coin<BaseAsset>,
    _deep_in: Coin<DEEP>,
    _min_quote_out: u64,
    _clock: &Clock,
    _ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    abort 0
}

public fun swap_exact_quote_for_base<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _quote_in: Coin<QuoteAsset>,
    _deep_in: Coin<DEEP>,
    _min_base_out: u64,
    _clock: &Clock,
    _ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    abort 0
}

public fun modify_order<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _order_id: u128,
    _new_quantity: u64,
    _clock: &Clock,
    _ctx: &TxContext,
) {
    abort 0
}

public fun cancel_order<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _order_id: u128,
    _clock: &Clock,
    _ctx: &TxContext,
) {
    abort 0
}

public fun cancel_orders<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _order_ids: vector<u128>,
    _clock: &Clock,
    _ctx: &TxContext,
) {
    abort 0
}

public fun cancel_all_orders<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _clock: &Clock,
    _ctx: &TxContext,
) {
    abort 0
}

public fun withdraw_settled_amounts<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
) {
    abort 0
}

public fun stake<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _amount: u64,
    _ctx: &TxContext,
) {
    abort 0
}

public fun unstake<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _ctx: &TxContext,
) {
    abort 0
}

public fun submit_proposal<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _taker_fee: u64,
    _maker_fee: u64,
    _stake_required: u64,
    _ctx: &TxContext,
) {
    abort 0
}

public fun vote<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _proposal_id: ID,
    _ctx: &TxContext,
) {
    abort 0
}

public fun claim_rebates<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &mut BalanceManager,
    _trade_proof: &TradeProof,
    _ctx: &TxContext,
) {
    abort 0
}

public fun borrow_flashloan_base<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _base_amount: u64,
    _ctx: &mut TxContext,
): (Coin<BaseAsset>, FlashLoan) {
    abort 0
}

public fun borrow_flashloan_quote<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _quote_amount: u64,
    _ctx: &mut TxContext,
): (Coin<QuoteAsset>, FlashLoan) {
    abort 0
}

public fun return_flashloan_base<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _coin: Coin<BaseAsset>,
    _flash_loan: FlashLoan,
) {
    abort 0
}

public fun return_flashloan_quote<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _coin: Coin<QuoteAsset>,
    _flash_loan: FlashLoan,
) {
    abort 0
}

public fun add_deep_price_point<BaseAsset, QuoteAsset, ReferenceBaseAsset, ReferenceQuoteAsset>(
    _target_pool: &mut Pool<BaseAsset, QuoteAsset>,
    _reference_pool: &Pool<ReferenceBaseAsset, ReferenceQuoteAsset>,
    _clock: &Clock,
) {
    abort 0
}

public fun burn_deep<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _treasury_cap: &mut ProtectedTreasury,
    _ctx: &mut TxContext,
): u64 {
    abort 0
}

public fun create_pool_admin<BaseAsset, QuoteAsset>(
    _registry: &mut Registry,
    _tick_size: u64,
    _lot_size: u64,
    _min_size: u64,
    _whitelisted_pool: bool,
    _stable_pool: bool,
    _cap: &DeepbookAdminCap,
    _ctx: &mut TxContext,
): ID {
    abort 0
}

public fun unregister_pool_admin<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _registry: &mut Registry,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

public fun update_allowed_versions<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
    _registry: &Registry,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

public fun whitelisted<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): bool {
    abort 0
}

public fun registered_pool<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): bool {
    abort 0
}

public fun get_quote_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _base_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

public fun get_base_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _quote_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

public fun get_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _base_quantity: u64,
    _quote_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

public fun mid_price<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _clock: &Clock,
): u64 {
    abort 0
}

public fun account_open_orders<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &BalanceManager,
): VecSet<u128> {
    abort 0
}

public fun get_level2_range<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _price_low: u64,
    _price_high: u64,
    _is_bid: bool,
    _clock: &Clock,
): (vector<u64>, vector<u64>) {
    abort 0
}

public fun locked_balance<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &BalanceManager,
): (u64, u64, u64) {
    abort 0
}

public fun pool_trade_params<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

public fun pool_book_params<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

public fun account<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _balance_manager: &BalanceManager,
): Account {
    abort 0
}

public(package) fun create_pool<BaseAsset, QuoteAsset>(
    _registry: &mut Registry,
    _tick_size: u64,
    _lot_size: u64,
    _min_size: u64,
    _creation_fee: Coin<DEEP>,
    _whitelisted_pool: bool,
    _stable_pool: bool,
    _ctx: &mut TxContext,
): ID {
    abort 0
}

public(package) fun bids<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): &BigVector<Order> {
    abort 0
}

public(package) fun asks<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): &BigVector<Order> {
    abort 0
}

public(package) fun load_inner<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
): &PoolInner<BaseAsset, QuoteAsset> {
    abort 0
}

public(package) fun load_inner_mut<BaseAsset, QuoteAsset>(
    _self: &mut Pool<BaseAsset, QuoteAsset>,
): &mut PoolInner<BaseAsset, QuoteAsset> {
    abort 0
}

public fun get_order<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _order_id: u128,
): Order {
    abort 0
}

/// Get multiple orders given a vector of order_ids.
public fun get_orders<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _order_ids: vector<u128>,
): vector<Order> {
    abort 0
}

