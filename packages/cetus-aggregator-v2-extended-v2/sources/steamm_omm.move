#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v2::steamm_omm;

use oracles::oracles::OraclePriceUpdate;
use std::type_name::{Self, TypeName};
use steamm::bank::Bank;
use steamm::omm::OracleQuoter;
use steamm::pool::Pool;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use suilend::lending_market::LendingMarket;

public struct SteammOMMSwapEvent has copy, drop, store {
    pool_id: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// omm swap
public fun swap_a2b<LENGDING_MARKET, COIN_A, COIN_B, BCOIN_A, BCOIN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BCOIN_A, BCOIN_B, OracleQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, COIN_A, BCOIN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, COIN_B, BCOIN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    oracle_price_update_a: OraclePriceUpdate,
    oracle_price_update_b: OraclePriceUpdate,
    coin_a: Coin<COIN_A>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_B> {
    abort 0
}

public fun swap_b2a<LENGDING_MARKET, COIN_A, COIN_B, BCOIN_A, BCOIN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BCOIN_A, BCOIN_B, OracleQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, COIN_A, BCOIN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, COIN_B, BCOIN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    oracle_price_update_a: OraclePriceUpdate,
    oracle_price_update_b: OraclePriceUpdate,
    coin_b: Coin<COIN_B>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_A> {
    abort 0
}
