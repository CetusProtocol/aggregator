// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_field, unused_type_parameter)]
module aftermath_amm::pool;

public struct CreatePoolCap<phantom T0> has key {
    id: sui::object::UID,
    lp_treasury_cap: sui::coin::TreasuryCap<T0>,
    lp_coin_metadata: sui::coin::CoinMetadata<T0>,
}

public struct Pool<phantom T0> has key, store {
    id: sui::object::UID,
    name: std::string::String,
    creator: address,
    lp_supply: sui::balance::Supply<T0>,
    illiquid_lp_supply: sui::balance::Balance<T0>,
    type_names: vector<std::ascii::String>,
    normalized_balances: vector<u128>,
    weights: vector<u64>,
    flatness: u64,
    fees_swap_in: vector<u64>,
    fees_swap_out: vector<u64>,
    fees_deposit: vector<u64>,
    fees_withdraw: vector<u64>,
    coin_decimals: std::option::Option<vector<u8>>,
    decimal_scalars: vector<u128>,
    lp_decimals: u8,
    lp_decimal_scalar: u128,
}
