#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::alphafi;

use alphafi_liquid_staking::liquid_staking::LiquidStakingInfo;
use std::type_name::TypeName;
use sui::coin::Coin;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;

public struct AlphafiSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// mint st_sui: sui -> st_sui
public fun swap_a2b<P: drop>(
    liquid_staking_info: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    sui_coin: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<P> {
    abort 0
}

// redeem st_sui: st_sui -> sui
public fun swap_b2a<P: drop>(
    liquid_staking_info: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    st_sui: Coin<P>,
    ctx: &mut TxContext,
): Coin<SUI> {
    abort 0
}
