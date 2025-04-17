#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::haedalpmm;

use haedal_pmm::oracle_driven_pool::Pool;
use pyth::price_info::PriceInfoObject;
use std::type_name::TypeName;
use sui::clock::Clock;
use sui::coin::Coin;

public struct HaedalPmmSwapEvent has copy, drop, store {
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
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
