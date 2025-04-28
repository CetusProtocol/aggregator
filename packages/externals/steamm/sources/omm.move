#[allow(unused_field, unused_variable, unused_const, unused_use)]
module steamm::omm;

use oracles::oracles::{OracleRegistry, OraclePriceUpdate};
use steamm::bank::Bank;
use steamm::pool::{Pool, SwapResult};
use steamm::version::Version;
use sui::clock::Clock;
use sui::coin::Coin;
use suilend::lending_market::LendingMarket;

public struct OracleQuoter has store {
    version: Version,
    // oracle params
    oracle_registry_id: ID,
    oracle_index_a: u64,
    oracle_index_b: u64,
    // coin info
    decimals_a: u8,
    decimals_b: u8,
}

public fun swap<P, A, B, B_A, B_B, LpType: drop>(
    pool: &mut Pool<B_A, B_B, OracleQuoter, LpType>,
    bank_a: &Bank<P, A, B_A>,
    bank_b: &Bank<P, B, B_B>,
    lending_market: &LendingMarket<P>,
    oracle_price_update_a: OraclePriceUpdate,
    oracle_price_update_b: OraclePriceUpdate,
    coin_a: &mut Coin<B_A>,
    coin_b: &mut Coin<B_B>,
    a2b: bool,
    amount_in: u64,
    min_amount_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): SwapResult {
    abort 0
}
