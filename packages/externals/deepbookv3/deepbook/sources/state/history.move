// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// History module tracks the volume data for the current epoch and past epochs.
/// It also tracks past trade params. Past maker fees are used to calculate fills for
/// old orders. The historic median is used to calculate rebates and burns.
#[allow(unused_field)]
module deepbookv3::history;

use deepbookv3::balances::Balances;
use deepbookv3::trade_params::TradeParams;
use sui::table::Table;


// === Structs ===
/// `Volumes` represents volume data for a single epoch.
/// Using flashloans on a whitelisted pool, assuming 1_000_000 * 1_000_000_000
/// in volume per trade, at 1 trade per millisecond, the total volume can reach
/// 1_000_000 * 1_000_000_000 * 1000 * 60 * 60 * 24 * 365 = 8.64e22 in one epoch.
public struct Volumes has store, copy, drop {
    total_volume: u128,
    total_staked_volume: u128,
    total_fees_collected: Balances,
    historic_median: u128,
    trade_params: TradeParams,
}

/// `History` represents the volume data for the current epoch and past epochs.
public struct History has store {
    epoch: u64,
    epoch_created: u64,
    volumes: Volumes,
    historic_volumes: Table<u64, Volumes>,
    balance_to_burn: u64,
}

// === Public-Package Functions ===
/// Create a new `History` instance. Called once upon pool creation. A single blank
/// `Volumes` instance is created and added to the historic_volumes table.
// ... existing code ...

public(package) fun empty(
    _trade_params: TradeParams,
    _epoch_created: u64,
    _ctx: &mut TxContext,
): History {
    abort 0
}

public(package) fun update(
    _self: &mut History,
    _trade_params: TradeParams,
    _ctx: &TxContext,
) {
    abort 0
}

public(package) fun reset_volumes(
    _self: &mut History,
    _trade_params: TradeParams,
) {
    abort 0
}

public(package) fun calculate_rebate_amount(
    _self: &mut History,
    _prev_epoch: u64,
    _maker_volume: u128,
    _account_stake: u64,
): Balances {
    abort 0
}

public(package) fun update_historic_median(_self: &mut History) {
    abort 0
}

public(package) fun add_volume(
    _self: &mut History,
    _maker_volume: u64,
    _account_stake: u64,
) {
    abort 0
}

public(package) fun balance_to_burn(_self: &History): u64 {
    abort 0
}

public(package) fun reset_balance_to_burn(_self: &mut History): u64 {
    abort 0
}

public(package) fun historic_maker_fee(_self: &History, _epoch: u64): u64 {
    abort 0
}

public(package) fun add_total_fees_collected(
    _self: &mut History,
    _fees: Balances,
) {
    abort 0
}
