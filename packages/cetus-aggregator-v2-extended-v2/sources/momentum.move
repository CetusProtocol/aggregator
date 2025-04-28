module cetus_aggregator_v2_extend_v2::momentum;

use mmt_v3::pool::Pool;
use mmt_v3::version::Version;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct MomentumSwapEvent has copy, drop, store {
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
