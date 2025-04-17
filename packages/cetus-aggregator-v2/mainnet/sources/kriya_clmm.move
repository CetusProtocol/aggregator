#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::kriya_clmm;

use kriya_clmm::pool::Pool;
use kriya_clmm::version::Version;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct KriyaClmmSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    version: &Version,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    version: &Version,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
