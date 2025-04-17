// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_field)]
module referral_vault::referral_vault;

public struct ReferralVault has key {
    id: sui::object::UID,
    version: u64,
    referrer_addresses: sui::table::Table<address, address>,
    rebates: sui::table::Table<address, sui::bag::Bag>,
}
