#[allow(unused_field)]
module afsui::staked_sui_vault;

use safe::safe::Safe;
use staking_afsui::afsui::AFSUI;
use sui::coin::{Coin, TreasuryCap};
use sui::object::UID;
use sui::sui::SUI;
use sui::tx_context::TxContext;

public struct StakedSuiVault has key {
    id: UID,
    version: u64,
}
