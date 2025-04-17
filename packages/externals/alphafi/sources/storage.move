#[allow(unused_use, unused_field, unused_variable)]
module alphafi_liquid_staking::storage;

use alphafi_liquid_staking::version::{Self, Version};
use std::type_name::{Self, TypeName};
use sui::bag::{Self, Bag};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::vec_map::{Self, VecMap};
use sui_system::staking_pool::{StakedSui, FungibleStakedSui, PoolTokenExchangeRate};
use sui_system::sui_system::SuiSystemState;

/// The Storage struct holds all stake for the LST.
public struct Storage has store {
    /// Sui balance. Unstake operations deposit SUI here.
    sui_pool: Balance<SUI>,
    /// Validators that have stake in the LST.
    validator_infos: vector<ValidatorInfo>,
    /// Total Sui managed by the LST. This is the sum of all active
    /// stake, inactive stake, and SUI in the sui_pool.
    total_sui_supply: u64,
    /// The epoch at which the storage was last refreshed.
    last_refresh_epoch: u64,
    /// Total weight of all the validators
    total_weight: u64,
    /// New validtor address weight map
    validator_addresses_and_weights: VecMap<address, u64>,
    /// Version of the struct
    version: Version,
    /// Extra fields for future-proofing.
    extra_fields: Bag,
}

/// ValidatorInfo holds all stake for a single validator.
public struct ValidatorInfo has store {
    /// The staking pool ID for the validator.
    staking_pool_id: ID,
    /// The validator's address.
    validator_address: address,
    /// The active stake for the validator.
    active_stake: Option<FungibleStakedSui>,
    /// The inactive stake for the validator.
    inactive_stake: Option<StakedSui>,
    /// The exchange rate for the validator.
    exchange_rate: PoolTokenExchangeRate,
    /// The total Sui staked to the validator (active stake + inactive stake).
    total_sui_amount: u64,
    /// Weight assigned to the current validator
    assigned_weight: u64,
    /// Extra fields for future-proofing.
    extra_fields: Bag,
}
