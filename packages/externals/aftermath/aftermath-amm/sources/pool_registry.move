// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_type_parameter, unused_field)]
module aftermath_amm::pool_registry;

public struct PoolRegistry has key, store {
    id: sui::object::UID,
    protocol_version: u64,
}
