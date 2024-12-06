// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Public-facing interface for the package.
module deepbookv3::pool;

use sui::clock::Clock;
use sui::coin::Coin;
use sui::versioned::Versioned;
use token::deep::DEEP;

// === Structs ===
#[allow(unused_field)]
public struct Pool<phantom BaseAsset, phantom QuoteAsset> has key {
    id: UID,
    inner: Versioned,
}

// === Public-Mutative Functions * EXCHANGE * ===
/// Swap exact base quantity without needing a `balance_manager`.
/// DEEP quantity can be overestimated. Returns three `Coin` objects:
/// base, quote, and deep. Some base quantity may be left over, if the
/// input quantity is not divisible by lot size.
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

/// Swap exact quote quantity without needing a `balance_manager`.
/// DEEP quantity can be overestimated. Returns three `Coin` objects:
/// base, quote, and deep. Some quote quantity may be left over if the
/// input quantity is not divisible by lot size.
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

/// Dry run to determine the quote quantity out for a given base quantity.
public fun get_quote_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _base_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the base quantity out for a given quote quantity.
public fun get_base_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _quote_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}

/// Dry run to determine the quantity out for a given base or quote quantity.
/// Only one out of base or quote quantity should be non-zero.
/// Returns the (base_quantity_out, quote_quantity_out, deep_quantity_required)
public fun get_quantity_out<BaseAsset, QuoteAsset>(
    _self: &Pool<BaseAsset, QuoteAsset>,
    _base_quantity: u64,
    _quote_quantity: u64,
    _clock: &Clock,
): (u64, u64, u64) {
    abort 0
}
