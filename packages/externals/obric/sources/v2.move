/// Module: obric
#[allow(unused_field)]
module obric::v2;

use pyth::price_info::PriceInfoObject;
use pyth::state::State as PythState;
use sui::balance;
use sui::coin;

public struct PairRegistry has key {
    id: UID,
    pair_ids: vector<address>,
}

public struct TradingPair<phantom X, phantom Y> has key {
    id: UID,
    // actual coin balance
    reserve_x: balance::Balance<X>,
    reserve_y: balance::Balance<Y>,
    concentration: u64,
    big_k: u128,
    target_x: u64,
    mult_x: u64,
    mult_y: u64,
    fee_millionth: u64,
    x_price_id: address,
    y_price_id: address,
    x_retain_decimals: u64,
    y_retain_decimals: u64,
    cumulative_volume: u64,
    volumes: vector<u64>,
    times: vector<u64>,
    target_y_based_lock: bool,
    target_y_reference: u64,
    pyth_mode: bool,
    pyth_y_add: u64,
    pyth_y_sub: u64,
}

public fun swap_x_to_y<X, Y>(
    _pair: &mut TradingPair<X, Y>,
    _clock: &sui::clock::Clock,
    _pyth_state: &PythState,
    _x_price_info_object: &PriceInfoObject,
    _y_price_info_object: &PriceInfoObject,
    x_coin: coin::Coin<X>,
    ctx: &mut TxContext,
): coin::Coin<Y> {
    abort 0
}

public fun swap_y_to_x<X, Y>(
    _pair: &mut TradingPair<X, Y>,
    _clock: &sui::clock::Clock,
    _pyth_state: &PythState,
    _x_price_info_object: &PriceInfoObject,
    _y_price_info_object: &PriceInfoObject,
    y_coin: coin::Coin<Y>,
    ctx: &mut TxContext,
): coin::Coin<X> {
    abort 0
}
