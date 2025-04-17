#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::afsui;

use afsui::staked_sui_vault::StakedSuiVault;
use safe::safe::Safe;
use staking_afsui::afsui::AFSUI;
use staking_refer::referral_vault::ReferralVault;
use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin, TreasuryCap};
use sui::event;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;

public struct AfsuiSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b(
    vault: &mut StakedSuiVault,
    safe: &mut Safe<TreasuryCap<AFSUI>>,
    sui_system: &mut SuiSystemState,
    refer: &ReferralVault,
    addr: address,
    coin_input: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<AFSUI> {
    abort 0
}
