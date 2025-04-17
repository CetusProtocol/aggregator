#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::cetus;

use cetus_aggregator::utils::transfer_or_destroy_coin;
use cetus_clmm::config::GlobalConfig;
use cetus_clmm::partner::Partner;
use cetus_clmm::pool::{Self, Pool, FlashSwapReceipt};
use cetus_clmm::tick_math;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct CetusSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    partner_id: ID,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
