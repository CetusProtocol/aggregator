// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Module: `staked_wal`
///
/// Implements the `StakedWal` functionality - a staked WAL is an object that
/// represents a staked amount of WALs in a staking pool. It is created in the
/// `staking_pool` on staking and can be split, joined, and burned. The burning
/// is performed via the `withdraw_stake` method in the `staking_pool`.
#[allow(unused_field)]
module walrus::staked_wal;

use sui::balance::Balance;
use wal::wal::WAL;

/// The state of the staked WAL. It can be either `Staked` or `Withdrawing`.
/// The `Withdrawing` state contains the epoch when the staked WAL can be
/// withdrawn.
public enum StakedWalState has copy, drop, store {
    // Default state of the staked WAL - it is staked in the staking pool.
    Staked,
    // The staked WAL is in the process of withdrawing. The value inside the
    // variant is the epoch when the staked WAL can be withdrawn.
    Withdrawing { withdraw_epoch: u32 },
}

/// Represents a staked WAL, does not store the `Balance` inside, but uses
/// `u64` to represent the staked amount. Behaves similarly to `Balance` and
/// `Coin` providing methods to `split` and `join`.
public struct StakedWal has key, store {
    id: UID,
    /// Whether the staked WAL is active or withdrawing.
    state: StakedWalState,
    /// ID of the staking pool.
    node_id: ID,
    /// The staked amount.
    principal: Balance<WAL>,
    /// The Walrus epoch when the staked WAL was activated.
    activation_epoch: u32,
}
