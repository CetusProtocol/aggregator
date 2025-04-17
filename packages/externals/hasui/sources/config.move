#[allow(unused_field)]
module hasui::config;

public struct StakingConfig has store {
    deposit_fee: u64,
    reward_fee: u64,
    validator_reward_fee: u64,
    service_fee: u64,
    withdraw_time_limit: u64,
    validator_count: u64,
}
