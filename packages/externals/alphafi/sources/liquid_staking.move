/// Module: liquid_staking
module alphafi_liquid_staking::liquid_staking;

use alphafi_liquid_staking::cell::{Self, Cell};
use alphafi_liquid_staking::fees::FeeConfig;
use alphafi_liquid_staking::storage::{Self, Storage};
use alphafi_liquid_staking::version::{Self, Version};
use std::type_name::{Self, TypeName};
use sui::bag::{Self, Bag};
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin, TreasuryCap};
use sui::package;
use sui::sui::SUI;
use sui::vec_map::VecMap;
use sui_system::sui_system::SuiSystemState;

public struct LIQUID_STAKING has drop {}

public struct LiquidStakingInfo<phantom P> has key, store {
    id: UID,
    lst_treasury_cap: TreasuryCap<P>,
    fee_config: Cell<FeeConfig>,
    fees: Balance<SUI>,
    accrued_spread_fees: u64,
    storage: Storage,
    flash_stake_lst: u64,
    collection_fee_cap_id: ID,
    is_paused: bool,
    version: Version,
    extra_fields: Bag,
}
