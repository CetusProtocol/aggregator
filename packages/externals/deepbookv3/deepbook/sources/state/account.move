// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Account module manages the account data for each user.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::account;

use deepbookv3::balances::{Self, Balances};
use deepbookv3::fill::Fill;
use sui::vec_set::{Self, VecSet};

// === Structs ===
/// Account data that is updated every epoch.
/// One Account struct per BalanceManager object.
public struct Account has copy, drop, store {
    epoch: u64,
    open_orders: VecSet<u128>,
    taker_volume: u128,
    maker_volume: u128,
    active_stake: u64,
    inactive_stake: u64,
    created_proposal: bool,
    voted_proposal: Option<ID>,
    unclaimed_rebates: Balances,
    settled_balances: Balances,
    owed_balances: Balances,
}

// === Public-View Functions ===
public fun open_orders(self: &Account): VecSet<u128> {
    self.open_orders
}

public fun taker_volume(self: &Account): u128 {
    self.taker_volume
}

public fun maker_volume(self: &Account): u128 {
    self.maker_volume
}

public fun total_volume(self: &Account): u128 {
    self.taker_volume + self.maker_volume
}

public fun active_stake(self: &Account): u64 {
    self.active_stake
}

public fun inactive_stake(self: &Account): u64 {
    self.inactive_stake
}

public fun created_proposal(self: &Account): bool {
    self.created_proposal
}

public fun voted_proposal(self: &Account): Option<ID> {
    self.voted_proposal
}

public fun settled_balances(self: &Account): Balances {
    self.settled_balances
}
