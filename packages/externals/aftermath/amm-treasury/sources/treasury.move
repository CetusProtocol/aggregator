// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_field)]
module treasury::treasury;

public struct Treasury has key {
    id: sui::object::UID,
    version: u64,
    funds: sui::bag::Bag,
}
