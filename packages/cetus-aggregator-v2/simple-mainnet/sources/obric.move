module cetus_aggregator_simple::obric;

use obric::v2::{TradingPair, swap_x_to_y, swap_y_to_x};
use pyth::price_info::PriceInfoObject;
use pyth::state::State as PythState;
use std::type_name::{Self, TypeName};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct ObricSwapEvent has copy, drop, store {
    pool_id: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<COIN_A, COIN_B>(
    pool: &mut TradingPair<COIN_A, COIN_B>,
    coin_a: Coin<COIN_A>,
    pyth_state: &PythState,
    a_price_info_object: &PriceInfoObject,
    b_price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_B> {
    let amount_in = coin::value(&coin_a);
    let coin_b = swap_x_to_y<COIN_A, COIN_B>(
        pool,
        clock,
        pyth_state,
        a_price_info_object,
        b_price_info_object,
        coin_a,
        ctx,
    );
    let amount_out = coin::value(&coin_b);
    emit(ObricSwapEvent {
        pool_id: object::id(pool),
        a2b: true,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<COIN_A>(),
        coin_b: type_name::get<COIN_B>(),
    });
    coin_b
}

public fun swap_b2a<COIN_A, COIN_B>(
    pool: &mut TradingPair<COIN_A, COIN_B>,
    coin_b: Coin<COIN_B>,
    pyth_state: &PythState,
    a_price_info_object: &PriceInfoObject,
    b_price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_A> {
    let amount_in = coin::value(&coin_b);
    let coin_a = swap_y_to_x<COIN_A, COIN_B>(
        pool,
        clock,
        pyth_state,
        a_price_info_object,
        b_price_info_object,
        coin_b,
        ctx,
    );
    let amount_out = coin::value(&coin_a);
    emit(ObricSwapEvent {
        pool_id: object::id(pool),
        a2b: false,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<COIN_A>(),
        coin_b: type_name::get<COIN_B>(),
    });
    coin_a
}
