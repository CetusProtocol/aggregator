/// Stake unlent Sui.
module suilend::staker;

use liquid_staking::liquid_staking::{LiquidStakingInfo, AdminCap};
use sui::balance::Balance;
use sui::sui::SUI;

public struct Staker<phantom P> has store {
    admin: AdminCap<P>,
    liquid_staking_info: LiquidStakingInfo<P>,
    lst_balance: Balance<P>,
    sui_balance: Balance<SUI>,
    liabilities: u64, // how much sui is owed to the reserve
}
