#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::turbos;

use std::type_name::{Self, TypeName};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event::emit;
use turbos_dex::pool::{Pool, Versioned};

public struct TurbosSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
    fee: TypeName,
}

public fun swap_a2b<CoinA, CoinB, Fee>(
    pool: &mut Pool<CoinA, CoinB, Fee>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    versioned: &Versioned,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB, Fee>(
    pool: &mut Pool<CoinA, CoinB, Fee>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    versioned: &Versioned,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
