#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::bluemove;

use bluemove::swap::Dex_Info;
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};

public struct BlueMoveSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    dex_info: &mut Dex_Info,
    coin_a: Coin<CoinA>,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    dex_info: &mut Dex_Info,
    coin_b: Coin<CoinB>,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
