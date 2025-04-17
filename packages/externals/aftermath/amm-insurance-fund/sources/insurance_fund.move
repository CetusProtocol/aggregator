// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_field)]
module insurance_fund::insurance_fund;

public struct AdminReceipt<phantom T0, phantom T1> {
    dummy_field: bool,
}

public struct AdminCap has key {
    id: sui::object::UID,
}

public struct InsuranceFund has key {
    id: sui::object::UID,
    version: u64,
    funds: sui::bag::Bag,
}
