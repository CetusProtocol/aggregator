#[allow(unused_field)]
module hawal::config;

/// `StakingConfig` holds configuration for Staking, will be stored in `Staking`.
public struct StakingConfig has store {
    /// Deposit fee rate, default is 0, reserved for future use
    deposit_fee: u64,
    /// Reward fee rate, default is 10 percent of rewards
    reward_fee: u64,
    /// Validator reward fee rate, take from the reward_fee, reserved for future use
    validator_reward_fee: u64,
    /// Unstake instant service fee rate
    service_fee: u64,
    /// Unstake normal wait time for claim
    withdraw_time_limit: u64,
    /// Validator count when calling do_stake
    validator_count: u64,
    /// Unstake walurs epoch is a built-in differentiator for walrus.system.epoch
    walrus_start_epoch: u32,
    /// Unstake walurs epoch start timestamp
    walrus_start_timestamp_ms: u64,
    /// Unstake walurs epoch duration time
    walrus_epoch_duration: u64,
}
