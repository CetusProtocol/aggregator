#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::flowx_clmm;

use flowx_clmm::pool_manager::PoolRegistry;
use flowx_clmm::versioned::Versioned;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct FlowxClmmSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    pool_register: &mut PoolRegistry,
    fee: u64,
    coin_a: Coin<CoinA>,
    versioned: &Versioned,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    pool_register: &mut PoolRegistry,
    fee: u64,
    coin_b: Coin<CoinB>,
    versioned: &Versioned,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
