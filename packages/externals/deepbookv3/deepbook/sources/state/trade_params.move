// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// TradeParams module contains the trade parameters for a trading pair.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::trade_params;

// === Structs ===
public struct TradeParams has copy, drop, store {
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
}
