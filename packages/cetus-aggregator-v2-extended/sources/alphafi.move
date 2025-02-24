module cetus_aggregator_v2::alphafi;

use alphafi_liquid_staking::liquid_staking::{mint, redeem, LiquidStakingInfo};
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event::emit;
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
    let amount_in = coin::value(&sui_coin);
    let st_sui = liquid_staking_info.mint(system_state, sui_coin, ctx);
    let amount_out = coin::value(&st_sui);
    emit(AlphafiSwapEvent {
        a2b: true,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<SUI>(),
        coin_b: type_name::get<P>(),
    });
    st_sui
}

// redeem st_sui: st_sui -> sui
public fun swap_b2a<P: drop>(
    liquid_staking_info: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    st_sui: Coin<P>,
    ctx: &mut TxContext,
): Coin<SUI> {
    let amount_in = coin::value(&st_sui);
    let sui_coin = liquid_staking_info.redeem(st_sui, system_state, ctx);
    let amount_out = coin::value(&sui_coin);
    emit(AlphafiSwapEvent {
        a2b: false,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<SUI>(),
        coin_b: type_name::get<P>(),
    });
    sui_coin
}
