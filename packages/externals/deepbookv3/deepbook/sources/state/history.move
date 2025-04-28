// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// History module tracks the volume data for the current epoch and past epochs.
/// It also tracks past trade params. Past maker fees are used to calculate
/// fills for old orders. The historic median is used to calculate rebates and
/// burns.
/// #[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::history;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::trade_params::TradeParams;
use sui::event;
use sui::table::{Self, Table};

// === Errors ===
const EHistoricVolumesNotFound: u64 = 0;

// === Structs ===
/// `Volumes` represents volume data for a single epoch.
/// Using flashloans on a whitelisted pool, assuming 1_000_000 * 1_000_000_000
/// in volume per trade, at 1 trade per millisecond, the total volume can reach
/// 1_000_000 * 1_000_000_000 * 1000 * 60 * 60 * 24 * 365 = 8.64e22 in one
/// epoch.
public struct Volumes has copy, drop, store {
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

public struct EpochData has copy, drop, store {
    epoch: u64,
    pool_id: ID,
    total_volume: u128,
    total_staked_volume: u128,
    base_fees_collected: u64,
    quote_fees_collected: u64,
    deep_fees_collected: u64,
    historic_median: u128,
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
}
