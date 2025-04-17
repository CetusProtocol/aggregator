#[allow(unused_field)]
module alphafi_liquid_staking::fees;

use sui::bag::{Self, Bag};

public struct FeeConfig has store {
    sui_mint_fee_bps: u64,
    staked_sui_mint_fee_bps: u64, // unused
    redeem_fee_bps: u64,
    staked_sui_redeem_fee_bps: u64, // unused
    spread_fee_bps: u64,
    flash_stake_fee_bps: u64,
    custom_redeem_fee_bps: u64, // unused
    redeem_fee_distribution_component_bps: u64,
    extra_fields: Bag, // in case we add other fees later
}
