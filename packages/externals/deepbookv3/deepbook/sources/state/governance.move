// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Governance module handles the governance of the `Pool` that it's attached to.
/// Users with non zero stake can create proposals and vote on them. Winning
/// proposals are used to set the trade parameters for the next epoch.
#[allow(unused_field)]
module deepbookv3::governance;

use deepbookv3::constants;
use deepbookv3::trade_params::{Self, TradeParams};
use sui::vec_map::{Self, VecMap};

// === Constants ===
const MAX_TAKER_STABLE: u64 = 100000;
const MAX_MAKER_STABLE: u64 = 50000;
const MAX_TAKER_VOLATILE: u64 = 1000000;
const MAX_MAKER_VOLATILE: u64 = 500000;

// === Structs ===
/// `Proposal` struct that holds the parameters of a proposal and its current total votes.
public struct Proposal has store, drop, copy {
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
    votes: u64,
}

/// Details of a pool. This is refreshed every epoch by the first
/// `State` action against this pool.
public struct Governance has store {
    /// Tracks refreshes.
    epoch: u64,
    /// If Pool is whitelisted.
    whitelisted: bool,
    /// If Pool is stable or volatile.
    stable: bool,
    /// List of proposals for the current epoch.
    proposals: VecMap<ID, Proposal>,
    /// Trade parameters for the current epoch.
    trade_params: TradeParams,
    /// Trade parameters for the next epoch.
    next_trade_params: TradeParams,
    /// All voting power from the current stakes.
    voting_power: u64,
    /// Quorum for the current epoch.
    quorum: u64,
}

/// Event emitted when trade parameters are updated.
public struct TradeParamsUpdateEvent has copy, drop {
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
}

// === Public-Package Functions ===
public(package) fun empty(stable_pool: bool, ctx: &TxContext): Governance {
    let default_taker = if (stable_pool) {
        MAX_TAKER_STABLE
    } else {
        MAX_TAKER_VOLATILE
    };
    let default_maker = if (stable_pool) {
        MAX_MAKER_STABLE
    } else {
        MAX_MAKER_VOLATILE
    };
    Governance {
        epoch: ctx.epoch(),
        whitelisted: false,
        stable: stable_pool,
        proposals: vec_map::empty(),
        trade_params: trade_params::new(
            default_taker,
            default_maker,
            constants::default_stake_required(),
        ),
        next_trade_params: trade_params::new(
            default_taker,
            default_maker,
            constants::default_stake_required(),
        ),
        voting_power: 0,
        quorum: 0,
    }
}

/// Whitelist a pool. This pool can be used as a DEEP reference price for
/// other pools. This pool will have zero fees.
// ... existing code ...

public(package) fun set_whitelist(_self: &mut Governance, _whitelisted: bool) {
    abort 0
}

public(package) fun whitelisted(_self: &Governance): bool {
    abort 0
}

public(package) fun update(_self: &mut Governance, _ctx: &TxContext) {
    abort 0
}

public(package) fun add_proposal(
    _self: &mut Governance,
    _taker_fee: u64,
    _maker_fee: u64,
    _stake_required: u64,
    _stake_amount: u64,
    _balance_manager_id: ID,
) {
    abort 0
}

public(package) fun adjust_vote(
    _self: &mut Governance,
    _from_proposal_id: Option<ID>,
    _to_proposal_id: Option<ID>,
    _stake_amount: u64,
) {
    abort 0
}

public(package) fun adjust_voting_power(
    _self: &mut Governance,
    _stake_before: u64,
    _stake_after: u64,
) {
    abort 0
}

public(package) fun trade_params(_self: &Governance): TradeParams {
    abort 0
}


// === Test Functions ===
#[test_only]
public fun voting_power(_self: &Governance): u64 {
    abort 0
}

#[test_only]
public fun stable(_self: &Governance): bool {
    abort 0
}

#[test_only]
public fun quorum(_self: &Governance): u64 {
    abort 0
}

#[test_only]
public fun proposals(_self: &Governance): VecMap<ID, Proposal> {
    abort 0
}

#[test_only]
public fun next_trade_params(_self: &Governance): TradeParams {
    abort 0
}

#[test_only]
public fun votes(_proposal: &Proposal): u64 {
    abort 0
}

#[test_only]
public fun params(_proposal: &Proposal): (u64, u64, u64) {
    abort 0
}

// ... existing code ...
