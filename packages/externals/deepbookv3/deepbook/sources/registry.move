// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Registry holds all created pools.
module deepbookv3::registry;

use deepbookv3::constants;
use std::type_name::{Self, TypeName};
use sui::bag::{Self, Bag};
use sui::dynamic_field;
use sui::vec_set::{Self, VecSet};
use sui::versioned::{Self, Versioned};

// === Errors ===
const EPoolAlreadyExists: u64 = 1;
const EPoolDoesNotExist: u64 = 2;
const EPackageVersionNotEnabled: u64 = 3;
const EVersionNotEnabled: u64 = 4;
const EVersionAlreadyEnabled: u64 = 5;
const ECannotDisableCurrentVersion: u64 = 6;
const ECoinAlreadyWhitelisted: u64 = 7;
const ECoinNotWhitelisted: u64 = 8;

public struct REGISTRY has drop {}

// === Structs ===
/// DeepbookAdminCap is used to call admin functions.
public struct DeepbookAdminCap has key, store {
    id: UID,
}

public struct Registry has key {
    id: UID,
    inner: Versioned,
}

public struct RegistryInner has store {
    allowed_versions: VecSet<u64>,
    pools: Bag,
    treasury_address: address,
}

public struct PoolKey has copy, drop, store {
    base: TypeName,
    quote: TypeName,
}

public struct StableCoinKey has copy, drop, store {}

// === Public Admin Functions ===
/// Sets the treasury address where the pool creation fees are sent
/// By default, the treasury address is the publisher of the deepbook package
public fun set_treasury_address(
    self: &mut Registry,
    treasury_address: address,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

/// Enables a package version
/// Only Admin can enable a package version
/// This function does not have version restrictions
public fun enable_version(self: &mut Registry, version: u64, _cap: &DeepbookAdminCap) {
    abort 0
}

/// Disables a package version
/// Only Admin can disable a package version
/// This function does not have version restrictions
public fun disable_version(self: &mut Registry, version: u64, _cap: &DeepbookAdminCap) {
    abort 0
}

/// Adds a stablecoin to the whitelist
/// Only Admin can add stablecoin
public fun add_stablecoin<StableCoin>(self: &mut Registry, _cap: &DeepbookAdminCap) {
    abort 0
}

/// Removes a stablecoin from the whitelist
/// Only Admin can remove stablecoin
public fun remove_stablecoin<StableCoin>(self: &mut Registry, _cap: &DeepbookAdminCap) {
    abort 0
}

/// Returns whether the given coin is whitelisted
public fun is_stablecoin(self: &Registry, stable_type: TypeName): bool {
    abort 0
}
