// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Account module manages the account data for each user.
#[allow(unused_field)]
module deepbookv3::account;

use deepbookv3::balances::Balances;
use deepbookv3::fill::Fill;
use sui::vec_set::VecSet;

// === Structs ===
/// Account data that is updated every epoch.
/// One Account struct per BalanceManager object.
public struct Account has store, copy, drop {
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
// ... existing code ...

public(package) fun empty(_ctx: &TxContext): Account {
    abort 0
}

public(package) fun update(
    _self: &mut Account,
    _ctx: &TxContext,
): (u64, u128, u64) {
    abort 0
}

public(package) fun process_maker_fill(_self: &mut Account, _fill: &Fill) {
    abort 0
}

public(package) fun add_taker_volume(_self: &mut Account, _volume: u64) {
    abort 0
}

public(package) fun set_voted_proposal(
    _self: &mut Account,
    _proposal: Option<ID>,
): Option<ID> {
    abort 0
}

public(package) fun set_created_proposal(_self: &mut Account, _created: bool) {
    abort 0
}

public(package) fun add_settled_balances(
    _self: &mut Account,
    _balances: Balances,
) {
    abort 0
}

public(package) fun add_owed_balances(_self: &mut Account, _balances: Balances) {
    abort 0
}

public(package) fun settle(_self: &mut Account): (Balances, Balances) {
    abort 0
}

public(package) fun add_rebates(_self: &mut Account, _rebates: Balances) {
    abort 0
}

public(package) fun claim_rebates(_self: &mut Account): u64 {
    abort 0
}

public(package) fun add_order(_self: &mut Account, _order_id: u128) {
    abort 0
}

public(package) fun remove_order(_self: &mut Account, _order_id: u128) {
    abort 0
}

public(package) fun add_stake(_self: &mut Account, _stake: u64): (u64, u64) {
    abort 0
}

public(package) fun remove_stake(_self: &mut Account) {
    abort 0
}
