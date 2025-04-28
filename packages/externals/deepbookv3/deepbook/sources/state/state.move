// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// State module represents the current state of the pool. It maintains all
/// the accounts, history, and governance information. It also processes all
/// the transactions and updates the state accordingly.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::state;

use deepbookv3::account::{Self, Account};
use deepbookv3::balance_manager::BalanceManager;
use deepbookv3::balances::{Self, Balances};
use deepbookv3::constants;
use deepbookv3::fill::Fill;
use deepbookv3::governance::{Self, Governance};
use deepbookv3::history::{Self, History};
use deepbookv3::order::Order;
use deepbookv3::order_info::OrderInfo;
use std::type_name;
use sui::event;
use sui::table::{Self, Table};
use token::deep::DEEP;

// === Errors ===
const ENoStake: u64 = 1;
const EMaxOpenOrders: u64 = 2;
const EAlreadyProposed: u64 = 3;

// === Structs ===
public struct State has store {
    accounts: Table<ID, Account>,
    history: History,
    governance: Governance,
}

public struct StakeEvent has copy, drop {
    pool_id: ID,
    balance_manager_id: ID,
    epoch: u64,
    amount: u64,
    stake: bool,
}

public struct ProposalEvent has copy, drop {
    pool_id: ID,
    balance_manager_id: ID,
    epoch: u64,
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
}

public struct VoteEvent has copy, drop {
    pool_id: ID,
    balance_manager_id: ID,
    epoch: u64,
    from_proposal_id: Option<ID>,
    to_proposal_id: ID,
    stake: u64,
}

public struct RebateEventV2 has copy, drop {
    pool_id: ID,
    balance_manager_id: ID,
    epoch: u64,
    claim_amount: Balances,
}

#[allow(unused_field)]
public struct RebateEvent has copy, drop {
    pool_id: ID,
    balance_manager_id: ID,
    epoch: u64,
    claim_amount: u64,
}
