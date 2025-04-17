#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::scallop;

use protocol::market::Market;
use protocol::version::Version;
use scallop_scoin::s_coin_converter::SCoinTreasury;
use std::type_name::TypeName;
use sui::clock::Clock;
use sui::coin::Coin;

public struct ScallopSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// mint s_coin: coin -> s_coin
public fun swap_a2b<CoinA, CoinB>(
    version: &Version,
    market: &mut Market,
    treasury: &mut SCoinTreasury<CoinB, CoinA>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

// redeem s_coin: s_coin -> coin
public fun swap_b2a<CoinB, CoinA>(
    version: &Version,
    market: &mut Market,
    treasury: &mut SCoinTreasury<CoinB, CoinA>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
