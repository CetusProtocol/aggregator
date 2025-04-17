/// A user_reward_manager farms pool_rewards to receive rewards proportional to their stake in the pool.
module suilend::liquidity_mining;

use std::type_name::TypeName;
use sui::bag::Bag;
use sui::balance::Balance;
use sui::clock::Clock;
use suilend::decimal::Decimal;

/// This struct manages all pool_rewards for a given stake pool.
public struct PoolRewardManager has key, store {
    id: UID,
    total_shares: u64,
    pool_rewards: vector<Option<PoolReward>>,
    last_update_time_ms: u64,
}

public struct PoolReward has key, store {
    id: UID,
    pool_reward_manager_id: ID,
    coin_type: TypeName,
    start_time_ms: u64,
    end_time_ms: u64,
    total_rewards: u64,
    /// amount of rewards that have been earned by users
    allocated_rewards: Decimal,
    cumulative_rewards_per_share: Decimal,
    num_user_reward_managers: u64,
    additional_fields: Bag,
}

// == Dynamic Field Keys
public struct RewardBalance<phantom T> has copy, drop, store {}

public struct UserRewardManager has store {
    pool_reward_manager_id: ID,
    share: u64,
    rewards: vector<Option<UserReward>>,
    last_update_time_ms: u64,
}

public struct UserReward has store {
    pool_reward_id: ID,
    earned_rewards: Decimal,
    cumulative_rewards_per_share: Decimal,
}
