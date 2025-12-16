// Copyright (c) Cetus Technology Limited

#[allow(unused_type_parameter, unused_field)]
/// `Rewarder` is the liquidity incentive module of `clmmpool`, which is commonly known as `farming`. In `clmmpool`,
/// liquidity is stored in a price range, so `clmmpool` uses a reward allocation method based on effective liquidity.
/// The allocation rules are roughly as follows:
///
/// 1. Each pool can configure multiple `Rewarders`, and each `Rewarder` releases rewards at a uniform speed according
/// to its configured release rate.
/// 2. During the time period when the liquidity price range contains the current price of the pool, the liquidity
/// position can participate in the reward distribution for this time period (if the pool itself is configured with
/// rewards), and the proportion of the distribution depends on the size of the liquidity value of the position.
/// Conversely, if the price range of a position does not include the current price of the pool during a certain period
/// of time, then this position will not receive any rewards during this period of time. This is similar to the
/// calculation of transaction fees.
module magma::rewarder {
    use std::type_name::TypeName;
    use sui::bag::Bag;

    /// Manager the Rewards and Points.
    public struct RewarderManager has store {
        rewarders: vector<Rewarder>,
        points_released: u128,
        points_growth_global: u128,
        last_updated_time: u64,
    }

    /// Rewarder store the information of a rewarder.
    /// `reward_coin` is the type of reward coin.
    /// `emissions_per_second` is the amount of reward coin emit per second.
    /// `growth_global` is Q64.X64,  is reward emited per liquidity.
    public struct Rewarder has copy, drop, store {
        reward_coin: TypeName,
        emissions_per_second: u128,
        growth_global: u128,
    }

    /// RewarderGlobalVault store the rewarder `Balance` in Bag globally.
    public struct RewarderGlobalVault has key, store {
        id: UID,
        balances: Bag,
    }
}
