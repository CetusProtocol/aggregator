module cetus_aggregator_v2::haedal_pmm;

use cetus_aggregator_v2::utils;
use haedal_pmm::oracle_driven_pool::Pool;
use haedal_pmm::trader::{sell_base_coin, sell_quote_coin};
use pyth::price_info::PriceInfoObject;
use std::type_name::{Self, TypeName};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

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
    let amount_in = coin::value(&coin_a);
    let mut coin_a = coin_a;
    let receive_coin_b = sell_base_coin<CoinA, CoinB>(
        pool,
        clock,
        base_price_pair_obj,
        quote_price_pair_obj,
        &mut coin_a,
        amount_in,
        0,
        ctx,
    );
    let amount_out = coin::value(&receive_coin_b);

    utils::transfer_or_destroy_coin(coin_a, ctx);

    emit(HaedalPmmSwapEvent {
        pool: object::id(pool),
        amount_in,
        amount_out,
        a2b: true,
        by_amount_in: true,
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });
    receive_coin_b
}

public fun swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    let amount_in = coin::value(&coin_b);
    let mut coin_b = coin_b;
    let receive_coin_a = sell_quote_coin<CoinA, CoinB>(
        pool,
        clock,
        base_price_pair_obj,
        quote_price_pair_obj,
        &mut coin_b,
        amount_in,
        0,
        ctx,
    );
    let amount_out = coin::value(&receive_coin_a);

    utils::transfer_or_destroy_coin(coin_b, ctx);

    emit(HaedalPmmSwapEvent {
        pool: object::id(pool),
        amount_in,
        amount_out,
        a2b: false,
        by_amount_in: true,
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });
    receive_coin_a
}
