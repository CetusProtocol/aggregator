// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// TradeParams module contains the trade parameters for a trading pair.
#[allow(unused_field)]
module deepbookv3::trade_params;

// === Structs ===
public struct TradeParams has store, drop, copy {
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
}

// === Public-Package Functions ===
// ... existing code ...

public(package) fun new(
    _taker_fee: u64,
    _maker_fee: u64,
    _stake_required: u64,
): TradeParams {
    abort 0
}

public(package) fun maker_fee(_trade_params: &TradeParams): u64 {
    abort 0
}

public(package) fun taker_fee(_trade_params: &TradeParams): u64 {
    abort 0
}

public(package) fun taker_fee_for_user(
    _self: &TradeParams,
    _active_stake: u64,
    _volume_in_deep: u128,
): u64 {
    abort 0
}

public(package) fun stake_required(_trade_params: &TradeParams): u64 {
    abort 0
}

