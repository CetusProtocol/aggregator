#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::flowx_amm;

use flowx_amm::factory::Container;
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct FlowxSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    container: &mut Container,
    coin_a: Coin<CoinA>,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    container: &mut Container,
    coin_b: Coin<CoinB>,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
