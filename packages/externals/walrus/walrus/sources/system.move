// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_variable, unused_function, unused_field, unused_mut_parameter)]
/// Module: system
module walrus::system;

/// The one and only system object.
public struct System has key {
    id: UID,
    version: u64,
    package_id: ID,
    new_package_id: Option<ID>,
}
