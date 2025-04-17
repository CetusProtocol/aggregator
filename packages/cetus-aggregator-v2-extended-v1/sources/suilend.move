#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::suilend;

use liquid_staking::liquid_staking::{mint, redeem, LiquidStakingInfo};
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event::emit;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;

public struct SuilendSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// mint spring_sui: sui -> spring_sui
public fun swap_a2b<P: drop>(
    liquid_staking_info: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    sui_coin: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<P> {
    abort 0
}

// redeem spring_sui: spring_sui -> sui
public fun swap_b2a<P: drop>(
    liquid_staking_info: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    spring_sui: Coin<P>,
    ctx: &mut TxContext,
): Coin<SUI> {
    abort 0
}
