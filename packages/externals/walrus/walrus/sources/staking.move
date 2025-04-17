// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
module walrus::staking;

/// The one and only staking object.
public struct Staking has key {
    id: UID,
    version: u64,
    package_id: ID,
    new_package_id: Option<ID>,
}
