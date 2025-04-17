#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::haedal;

use hasui::hasui::HASUI;
use hasui::staking::Staking;
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;

public struct HedalSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    coin_a: TypeName,
    coin_b: TypeName,
}

// a2b: true -> stake from SUI to HASUI
// a2b: false -> unstake from HASUI to SUI
// now haedak lsd support two direction swap, so we need to add a2b to the event
public struct HaedalSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b(
    pool: &mut Staking,
    sui_system: &mut SuiSystemState,
    coin_input: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<HASUI> {
    abort 0
}

public fun swap_b2a(
    pool: &mut Staking,
    sui_system: &mut SuiSystemState,
    coin_input: Coin<HASUI>,
    ctx: &mut TxContext,
): Coin<SUI> {
    abort 0
}
