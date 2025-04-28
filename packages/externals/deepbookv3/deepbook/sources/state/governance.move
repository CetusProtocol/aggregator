// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Governance module handles the governance of the `Pool` that it's attached
/// to.
/// Users with non zero stake can create proposals and vote on them. Winning
/// proposals are used to set the trade parameters for the next epoch.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::governance;

use deepbookv3::constants;
use deepbookv3::trade_params::{Self, TradeParams};
use sui::event;
use sui::vec_map::{Self, VecMap};

// === Errors ===
const EInvalidMakerFee: u64 = 1;
const EInvalidTakerFee: u64 = 2;
const EProposalDoesNotExist: u64 = 3;
const EMaxProposalsReachedNotEnoughVotes: u64 = 4;
const EWhitelistedPoolCannotChange: u64 = 5;

// === Constants ===
const FEE_MULTIPLE: u64 = 1000; // 0.01 basis points
const MIN_TAKER_STABLE: u64 = 10000; // 0.1 basis points
const MAX_TAKER_STABLE: u64 = 100000; // 1 basis points
const MIN_MAKER_STABLE: u64 = 0;
const MAX_MAKER_STABLE: u64 = 50000; // 0.5 basis points
const MIN_TAKER_VOLATILE: u64 = 100000; // 1 basis points
const MAX_TAKER_VOLATILE: u64 = 1000000; // 10 basis points
const MIN_MAKER_VOLATILE: u64 = 0;
const MAX_MAKER_VOLATILE: u64 = 500000; // 5 basis points
const MAX_PROPOSALS: u64 = 100;
const VOTING_POWER_THRESHOLD: u64 = 100_000_000_000; // 100k deep

// === Structs ===
/// `Proposal` struct that holds the parameters of a proposal and its current
/// total votes.
public struct Proposal has copy, drop, store {
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
