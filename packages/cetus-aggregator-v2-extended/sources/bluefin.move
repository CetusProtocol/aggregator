module cetus_aggregator_v2::bluefin;

use bluefin_spot::config::GlobalConfig;
use bluefin_spot::pool::{swap, Pool};
use cetus_aggregator_v2::utils;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct BluefinSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    global_config: &mut GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    let amount_in = coin::value(&coin_a);

    let balance_a = coin::into_balance(coin_a);
    let balance_b = balance::zero<CoinB>();

    let (receive_balance_a, receive_balance_b) = swap<CoinA, CoinB>(
        clock,
        global_config,
        pool,
        balance_a,
        balance_b,
        true,
        true,
        amount_in,
        0,
        utils::min_sqrt_price() + 1,
    );
    let amount_out = balance::value(&receive_balance_b);

    emit(BluefinSwapEvent {
        pool: object::id(pool),
        amount_in,
        amount_out,
        a2b: true,
        by_amount_in: true,
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });

    balance::destroy_zero(receive_balance_a);
    coin::from_balance(receive_balance_b, ctx)
}

public fun swap_b2a<CoinA, CoinB>(
    global_config: &mut GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    let amount_in = coin::value(&coin_b);

    let balance_b = coin::into_balance(coin_b);
    let balance_a = balance::zero<CoinA>();

    let (receive_balance_a, receive_balance_b) = swap<CoinA, CoinB>(
        clock,
        global_config,
        pool,
        balance_a,
        balance_b,
        false,
        true,
        amount_in,
        0,
        utils::max_sqrt_price() - 1,
    );
    let amount_out = balance::value(&receive_balance_a);

    emit(BluefinSwapEvent {
        pool: object::id(pool),
        amount_in,
        amount_out,
        a2b: false,
        by_amount_in: true,
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });

    balance::destroy_zero(receive_balance_b);
    coin::from_balance(receive_balance_a, ctx)
}
