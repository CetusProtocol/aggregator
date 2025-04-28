// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Public-facing interface for the package.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::pool;

use deepbookv3::account::Account;
use deepbookv3::balance_manager::{Self, BalanceManager, TradeProof};
use deepbookv3::big_vector::BigVector;
use deepbookv3::book::{Self, Book};
use deepbookv3::constants;
use deepbookv3::deep_price::{Self, DeepPrice, OrderDeepPrice};
use deepbookv3::order::Order;
use deepbookv3::order_info::{Self, OrderInfo};
use deepbookv3::registry::{DeepbookAdminCap, Registry};
use deepbookv3::state::{Self, State};
use deepbookv3::vault::{Self, Vault, FlashLoan};
use std::type_name;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::vec_set::{Self, VecSet};
use sui::versioned::{Self, Versioned};
use token::deep::{DEEP, ProtectedTreasury};

// === Errors ===
const EInvalidFee: u64 = 1;
const ESameBaseAndQuote: u64 = 2;
const EInvalidTickSize: u64 = 3;
const EInvalidLotSize: u64 = 4;
const EInvalidMinSize: u64 = 5;
const EInvalidQuantityIn: u64 = 6;
const EIneligibleReferencePool: u64 = 7;
const EInvalidOrderBalanceManager: u64 = 9;
const EIneligibleTargetPool: u64 = 10;
const EPackageVersionDisabled: u64 = 11;
const EMinimumQuantityOutNotMet: u64 = 12;
const EInvalidStake: u64 = 13;
const EPoolNotRegistered: u64 = 14;
const EPoolCannotBeBothWhitelistedAndStable: u64 = 15;

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

public struct PoolCreated<phantom BaseAsset, phantom QuoteAsset> has copy, drop, store {
    pool_id: ID,
    taker_fee: u64,
    maker_fee: u64,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    whitelisted_pool: bool,
    treasury_address: address,
}

public struct BookParamsUpdated<phantom BaseAsset, phantom QuoteAsset> has copy, drop, store {
    pool_id: ID,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    timestamp: u64,
}

public struct DeepBurned<phantom BaseAsset, phantom QuoteAsset> has copy, drop, store {
    pool_id: ID,
    deep_burned: u64,
}

// === Public-Mutative Functions * POOL CREATION * ===
/// Create a new pool. The pool is registered in the registry.
/// Checks are performed to ensure the tick size, lot size,
/// and min size are valid.
/// The creation fee is transferred to the treasury address.
/// Returns the id of the pool created
public fun create_permissionless_pool<BaseAsset, QuoteAsset>(
    registry: &mut Registry,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    creation_fee: Coin<DEEP>,
    ctx: &mut TxContext,
): ID {
    abort 0
}

// === Public-Mutative Functions * EXCHANGE * ===
/// Place a limit order. Quantity is in base asset terms.
/// For current version pay_with_deep must be true, so the fee will be paid with
/// DEEP tokens.
public fun place_limit_order<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    client_order_id: u64,
    order_type: u8,
    self_matching_option: u8,
    price: u64,
    quantity: u64,
    is_bid: bool,
    pay_with_deep: bool,
    expire_timestamp: u64,
    clock: &Clock,
    ctx: &TxContext,
): OrderInfo {
    abort 0
}

/// Place a market order. Quantity is in base asset terms. Calls
/// place_limit_order with
/// a price of MAX_PRICE for bids and MIN_PRICE for asks. Any quantity not
/// filled is cancelled.
public fun place_market_order<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    client_order_id: u64,
    self_matching_option: u8,
    quantity: u64,
    is_bid: bool,
    pay_with_deep: bool,
    clock: &Clock,
    ctx: &TxContext,
): OrderInfo {
    abort 0
}

/// Swap exact base quantity without needing a `balance_manager`.
/// DEEP quantity can be overestimated. Returns three `Coin` objects:
/// base, quote, and deep. Some base quantity may be left over, if the
/// input quantity is not divisible by lot size.
public fun swap_exact_base_for_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_in: Coin<BaseAsset>,
    deep_in: Coin<DEEP>,
    min_quote_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    abort 0
}

/// Swap exact quote quantity without needing a `balance_manager`.
/// DEEP quantity can be overestimated. Returns three `Coin` objects:
/// base, quote, and deep. Some quote quantity may be left over if the
/// input quantity is not divisible by lot size.
public fun swap_exact_quote_for_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    quote_in: Coin<QuoteAsset>,
    deep_in: Coin<DEEP>,
    min_base_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    abort 0
}

/// Swap exact quantity without needing a balance_manager.
public fun swap_exact_quantity<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_in: Coin<BaseAsset>,
    quote_in: Coin<QuoteAsset>,
    deep_in: Coin<DEEP>,
    min_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    abort 0
}

/// Modifies an order given order_id and new_quantity.
/// New quantity must be less than the original quantity and more
/// than the filled quantity. Order must not have already expired.
public fun modify_order<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    order_id: u128,
    new_quantity: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    abort 0
}

/// Cancel an order. The order must be owned by the balance_manager.
/// The order is removed from the book and the balance_manager's open orders.
/// The balance_manager's balance is updated with the order's remaining
/// quantity.
/// Order canceled event is emitted.
public fun cancel_order<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    order_id: u128,
    clock: &Clock,
    ctx: &TxContext,
) {
    abort 0
}

/// Cancel multiple orders within a vector. The orders must be owned by the
/// balance_manager.
/// The orders are removed from the book and the balance_manager's open orders.
/// Order canceled events are emitted.
/// If any order fails to cancel, no orders will be cancelled.
public fun cancel_orders<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    order_ids: vector<u128>,
    clock: &Clock,
    ctx: &TxContext,
) {
    abort 0
}

/// Cancel all open orders placed by the balance manager in the pool.
public fun cancel_all_orders<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    clock: &Clock,
    ctx: &TxContext,
) {
    abort 0
}

/// Withdraw settled amounts to the `balance_manager`.
public fun withdraw_settled_amounts<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
) {
    abort 0
}

// === Public-Mutative Functions * GOVERNANCE * ===
/// Stake DEEP tokens to the pool. The balance_manager must have enough DEEP
/// tokens.
/// The balance_manager's data is updated with the staked amount.
public fun stake<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    amount: u64,
    ctx: &TxContext,
) {
    abort 0
}

/// Unstake DEEP tokens from the pool. The balance_manager must have enough
/// staked DEEP tokens.
/// The balance_manager's data is updated with the unstaked amount.
/// Balance is transferred to the balance_manager immediately.
public fun unstake<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    ctx: &TxContext,
) {
    abort 0
}

/// Submit a proposal to change the taker fee, maker fee, and stake required.
/// The balance_manager must have enough staked DEEP tokens to participate.
/// Each balance_manager can only submit one proposal per epoch.
/// If the maximum proposal is reached, the proposal with the lowest vote is
/// removed.
/// If the balance_manager has less voting power than the lowest voted proposal,
/// the proposal is not added.
public fun submit_proposal<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
    ctx: &TxContext,
) {
    abort 0
}

/// Vote on a proposal. The balance_manager must have enough staked DEEP tokens
/// to participate.
/// Full voting power of the balance_manager is used.
/// Voting for a new proposal will remove the vote from the previous proposal.
public fun vote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    proposal_id: ID,
    ctx: &TxContext,
) {
    abort 0
}

/// Claim the rewards for the balance_manager. The balance_manager must have
/// rewards to claim.
/// The balance_manager's data is updated with the claimed rewards.
public fun claim_rebates<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    ctx: &TxContext,
) {
    abort 0
}

// === Public-Mutative Functions * FLASHLOAN * ===
/// Borrow base assets from the Pool. A hot potato is returned,
/// forcing the borrower to return the assets within the same transaction.
public fun borrow_flashloan_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_amount: u64,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, FlashLoan) {
    abort 0
}

/// Borrow quote assets from the Pool. A hot potato is returned,
/// forcing the borrower to return the assets within the same transaction.
public fun borrow_flashloan_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    quote_amount: u64,
    ctx: &mut TxContext,
): (Coin<QuoteAsset>, FlashLoan) {
    abort 0
}

/// Return the flashloaned base assets to the Pool.
/// FlashLoan object will only be unwrapped if the assets are returned,
/// otherwise the transaction will fail.
public fun return_flashloan_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    coin: Coin<BaseAsset>,
    flash_loan: FlashLoan,
) {
    abort 0
}

/// Return the flashloaned quote assets to the Pool.
/// FlashLoan object will only be unwrapped if the assets are returned,
/// otherwise the transaction will fail.
public fun return_flashloan_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    coin: Coin<QuoteAsset>,
    flash_loan: FlashLoan,
) {
    abort 0
}

// === Public-Mutative Functions * OPERATIONAL * ===

/// Adds a price point along with a timestamp to the deep price.
/// Allows for the calculation of deep price per base asset.
public fun add_deep_price_point<BaseAsset, QuoteAsset, ReferenceBaseAsset, ReferenceQuoteAsset>(
    target_pool: &mut Pool<BaseAsset, QuoteAsset>,
    reference_pool: &Pool<ReferenceBaseAsset, ReferenceQuoteAsset>,
    clock: &Clock,
) {
    abort 0
}

/// Burns DEEP tokens from the pool. Amount to burn is within history
public fun burn_deep<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    treasury_cap: &mut ProtectedTreasury,
    ctx: &mut TxContext,
): u64 {
    abort 0
}

// === Public-Mutative Functions * ADMIN * ===
/// Create a new pool. The pool is registered in the registry.
/// Checks are performed to ensure the tick size, lot size, and min size are
/// valid.
/// Returns the id of the pool created
public fun create_pool_admin<BaseAsset, QuoteAsset>(
    registry: &mut Registry,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    whitelisted_pool: bool,
    stable_pool: bool,
    _cap: &DeepbookAdminCap,
    ctx: &mut TxContext,
): ID {
    abort 0
}

/// Unregister a pool in case it needs to be redeployed.
public fun unregister_pool_admin<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    registry: &mut Registry,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

/// Takes the registry and updates the allowed version within pool
/// Only admin can update the allowed versions
/// This function does not have version restrictions
public fun update_allowed_versions<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    registry: &Registry,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

/// Adjust the tick size of the pool. Only admin can adjust the tick size.
public fun adjust_tick_size_admin<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    new_tick_size: u64,
    _cap: &DeepbookAdminCap,
    clock: &Clock,
) {
    abort 0
}

/// Adjust and lot size and min size of the pool. New lot size must be smaller
/// than current lot size. Only admin can adjust the min size and lot size.
public fun adjust_min_lot_size_admin<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    new_lot_size: u64,
    new_min_size: u64,
    _cap: &DeepbookAdminCap,
    clock: &Clock,
) {
    abort 0
}

// === Public-View Functions ===
/// Accessor to check if the pool is whitelisted.
public fun whitelisted<BaseAsset, QuoteAsset>(self: &Pool<BaseAsset, QuoteAsset>): bool {
    abort 0
}

/// Accessor to check if the pool is a stablecoin pool.
public fun stable_pool<BaseAsset, QuoteAsset>(self: &Pool<BaseAsset, QuoteAsset>): bool {
    abort 0
}

public fun registered_pool<BaseAsset, QuoteAsset>(self: &Pool<BaseAsset, QuoteAsset>): bool {
    abort 0
}

/// Dry run to determine the quote quantity out for a given base quantity.
/// Uses DEEP token as fee.
public fun get_quote_quantity_out<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    base_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the base quantity out for a given quote quantity.
/// Uses DEEP token as fee.
public fun get_base_quantity_out<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    quote_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the quote quantity out for a given base quantity.
/// Uses input token as fee.
public fun get_quote_quantity_out_input_fee<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    base_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the base quantity out for a given quote quantity.
/// Uses input token as fee.
public fun get_base_quantity_out_input_fee<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    quote_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the quantity out for a given base or quote quantity.
/// Only one out of base or quote quantity should be non-zero.
/// Returns the (base_quantity_out, quote_quantity_out, deep_quantity_required)
/// Uses DEEP token as fee.
public fun get_quantity_out<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    base_quantity: u64,
    quote_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the quantity out for a given base or quote quantity.
/// Only one out of base or quote quantity should be non-zero.
/// Returns the (base_quantity_out, quote_quantity_out, deep_quantity_required)
/// Uses input token as fee.
public fun get_quantity_out_input_fee<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    base_quantity: u64,
    quote_quantity: u64,
    clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Returns the mid price of the pool.
public fun mid_price<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    clock: &Clock,
): u64 {
    abort 0
}

/// Returns the order_id for all open order for the balance_manager in the pool.
public fun account_open_orders<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    balance_manager: &BalanceManager,
): VecSet<u128> {
    abort 0
}

/// Returns the (price_vec, quantity_vec) for the level2 order book.
/// The price_low and price_high are inclusive, all orders within the range are
/// returned.
/// is_bid is true for bids and false for asks.
public fun get_level2_range<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    price_low: u64,
    price_high: u64,
    is_bid: bool,
    clock: &Clock,
): (vector<u64>, vector<u64>) {
    abort 0
}

/// Returns the (price_vec, quantity_vec) for the level2 order book.
/// Ticks are the maximum number of ticks to return starting from best bid and
/// best ask.
/// (bid_price, bid_quantity, ask_price, ask_quantity) are returned as 4
/// vectors.
/// The price vectors are sorted in descending order for bids and ascending
/// order for asks.
public fun get_level2_ticks_from_mid<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    ticks: u64,
    clock: &Clock,
): (vector<u64>, vector<u64>, vector<u64>, vector<u64>) {
    abort 0
}

/// Get all balances held in this pool.
public fun vault_balances<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

/// Get the ID of the pool given the asset types.
public fun get_pool_id_by_asset<BaseAsset, QuoteAsset>(registry: &Registry): ID {
    abort 0
}

/// Get the Order struct
public fun get_order<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    order_id: u128,
): Order {
    abort 0
}

/// Get multiple orders given a vector of order_ids.
public fun get_orders<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    order_ids: vector<u128>,
): vector<Order> {
    abort 0
}

/// Return a copy of all orders that are in the book for this account.
public fun get_account_order_details<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    balance_manager: &BalanceManager,
): vector<Order> {
    abort 0
}

/// Return the DEEP price for the pool.
public fun get_order_deep_price<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
): OrderDeepPrice {
    abort 0
}

/// Returns the deep required for an order if it's taker or maker given quantity
/// and price
/// Does not account for discounted taker fees
/// Returns (deep_required_taker, deep_required_maker)
public fun get_order_deep_required<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    base_quantity: u64,
    price: u64,
): (u64, u64) {
    abort 0
}

/// Returns the locked balance for the balance_manager in the pool
/// Returns (base_quantity, quote_quantity, deep_quantity)
public fun locked_balance<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    balance_manager: &BalanceManager,
): (u64, u64, u64) {
    abort 0
}

/// Returns the trade params for the pool.
public fun pool_trade_params<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

/// Returns the currently leading trade params for the next epoch for the pool
public fun pool_trade_params_next<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

/// Returns the tick size, lot size, and min size for the pool.
public fun pool_book_params<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
): (u64, u64, u64) {
    abort 0
}

public fun account<BaseAsset, QuoteAsset>(
    self: &Pool<BaseAsset, QuoteAsset>,
    balance_manager: &BalanceManager,
): Account {
    abort 0
}

/// Returns the quorum needed to pass proposal in the current epoch
public fun quorum<BaseAsset, QuoteAsset>(self: &Pool<BaseAsset, QuoteAsset>): u64 {
    abort 0
}
