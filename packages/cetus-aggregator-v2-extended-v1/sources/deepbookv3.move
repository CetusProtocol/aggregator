#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::deepbookv3;

use deepbookv3::pool::Pool;
use deepbookv3_vaults::global_config::GlobalConfig;
use std::type_name::TypeName;
use sui::clock::Clock;
use sui::coin::Coin;
use token::deep::DEEP;

public struct DeepbookV3SwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    config: &mut GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    coin_deep: Coin<DEEP>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    config: &mut GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    coin_deep: Coin<DEEP>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
