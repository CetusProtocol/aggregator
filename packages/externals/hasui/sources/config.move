module hasui::config {
    #[allow(unused_field)]
    struct StakingConfig has store {
        deposit_fee: u64,
        reward_fee: u64,
        validator_reward_fee: u64,
        service_fee: u64,
        withdraw_time_limit: u64,
        validator_count: u64
    }
}