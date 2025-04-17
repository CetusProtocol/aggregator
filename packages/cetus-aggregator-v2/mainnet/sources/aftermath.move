#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::aftermath;

use aftermath_amm::pool::Pool;
use aftermath_amm::pool_registry::PoolRegistry;
use insurance_fund::insurance_fund::InsuranceFund;
use protocol_fee_vault::vault::ProtocolFeeVault;
use referral_vault::referral_vault::ReferralVault;
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event::emit;
use treasury::treasury::Treasury;

public struct AftermathSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB, Fee>(
    pool: &mut Pool<Fee>,
    pool_registry: &PoolRegistry,
    vault: &ProtocolFeeVault,
    treasury: &mut Treasury,
    insurance_fund: &mut InsuranceFund,
    referral_vault: &ReferralVault,
    expect_amount_out: u64,
    slippage: u64,
    coin_a: Coin<CoinA>,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB, Fee>(
    pool: &mut Pool<Fee>,
    pool_registry: &PoolRegistry,
    vault: &ProtocolFeeVault,
    treasury: &mut Treasury,
    insurance_fund: &mut InsuranceFund,
    referral_vault: &ReferralVault,
    expect_amount_out: u64,
    slippage: u64,
    coin_b: Coin<CoinB>,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
