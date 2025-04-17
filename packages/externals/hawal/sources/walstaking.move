module hawal::walstaking;

use hawal::config::StakingConfig;
use hawal::hawal::HAWAL;
use hawal::vault::Vault;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::{Coin, TreasuryCap};
use sui::table::Table;
use sui::vec_map::VecMap;
use wal::wal::WAL;
use walrus::staked_wal::StakedWal;
use walrus::staking::Staking as WalStaking;
use walrus::system::System;

/// There is only one `Staking` share object.
public struct Staking has key {
    id: UID,
    /// used to control the package upgrade
    version: u64,
    /// configuration for the protol
    config: StakingConfig,
    /// keep user's staked wal in current epoch, will be staked in validators at the end of currnet epoch
    wal_vault: Vault<WAL>,
    /// keep the protocol fee
    protocol_wal_vault: Vault<WAL>,
    /// TreasuryCap of the wrapped token
    hawal_treasury_cap: TreasuryCap<HAWAL>,
    /// total staked wal amount in history
    total_staked: u64,
    /// total unstaked wal amount in history
    total_unstaked: u64,
    /// total rewards in history
    total_rewards: u64,
    /// current unstaked but not yet claimed sui amount
    unclaimed_wal_amount: u64,
    /// total protocol fees in history
    collected_protocol_fees: u64,
    /// total protocol fees Pending in history
    collected_protocol_fees_pending: u64,
    /// uncollected protocol fees
    uncollected_protocol_fees: u64,
    /// the number value for haWAL supply, convenient for computing and querying
    hawal_supply: u64,
    pause_stake: bool,
    pause_unstake: bool,
    /// active validators in current epoch, updated every epoch.
    active_validators: vector<ID>,
    /// validators that have stakes, could be ordered by apy
    validators: vector<ID>,
    /// pools for validators
    pools: Table<ID, PoolInfo>,
    rewards_last_updated_epoch: u64,
}

public struct PoolInfo has store {
    //staked_wals: TableQueue<StakedWal>,
    staked: VecMap<u32, StakedWal>, // Activation Epoch as key
    withdrawing: VecMap<u32, StakedWal>, // Withdrawing Epoch as key
    /// Total staked to this validator.
    total_staked: u64,
    /// The last updated rewards.
    rewards: u64,
}

/// The Unstake Normal ticket, an NFT held by issuer to claim the WAL back.
public struct UnstakeTicket has key {
    id: UID,
    /// Timestamp unstake at
    unstake_timestamp_ms: u64,
    /// The original token amount
    hawal_amount: u64,
    /// The unstaked WAL amount
    wal_amount: u64,
    /// The claim epoch number
    claim_epoch: u32,
    /// Timestamp that the WAL can be claimed after
    claim_timestamp_ms: u64,
}
