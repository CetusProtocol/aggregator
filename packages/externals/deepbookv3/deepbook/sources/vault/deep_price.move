// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// DEEP price module. This module maintains the conversion rate
/// between DEEP and the base and quote assets.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::deep_price;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::constants;
use sui::event;

// === Errors ===
const EDataPointRecentlyAdded: u64 = 1;
const ENoDataPoints: u64 = 2;

// === Constants ===
// Minimum of 1 minutes between data points
const MIN_DURATION_BETWEEN_DATA_POINTS_MS: u64 = 1000 * 60;
// Price points older than 1 day will be removed
const MAX_DATA_POINT_AGE_MS: u64 = 1000 * 60 * 60 * 24;
// Maximum number of data points to maintan
const MAX_DATA_POINTS: u64 = 100;

// === Structs ===
/// DEEP price point.
public struct Price has drop, store {
    conversion_rate: u64,
    timestamp: u64,
}

/// DEEP price point added event.
public struct PriceAdded has copy, drop {
    conversion_rate: u64,
    timestamp: u64,
    is_base_conversion: bool,
    reference_pool: ID,
    target_pool: ID,
}

/// DEEP price points used for trading fee calculations.
public struct DeepPrice has drop, store {
    base_prices: vector<Price>,
    cumulative_base: u64,
    quote_prices: vector<Price>,
    cumulative_quote: u64,
}

public struct OrderDeepPrice has copy, drop, store {
    asset_is_base: bool,
    deep_per_asset: u64,
}

// === Public-View Functions ===
public fun asset_is_base(self: &OrderDeepPrice): bool {
    self.asset_is_base
}

public fun deep_per_asset(self: &OrderDeepPrice): u64 {
    self.deep_per_asset
}
