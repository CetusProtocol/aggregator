// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Registry holds all created pools.
#[allow(unused_field, unused_type_parameter)]
module deepbookv3::registry;

use deepbookv3::constants;
use std::type_name::TypeName;
use sui::bag::{Self, Bag};
use sui::vec_set::{Self, VecSet};
use sui::versioned::{Self, Versioned};


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

fun init(_: REGISTRY, ctx: &mut TxContext) {
    let registry_inner = RegistryInner {
        allowed_versions: vec_set::singleton(constants::current_version()),
        pools: bag::new(ctx),
        treasury_address: ctx.sender(),
    };
    let registry = Registry {
        id: object::new(ctx),
        inner: versioned::create(
            constants::current_version(),
            registry_inner,
            ctx,
        ),
    };
    transfer::share_object(registry);
    let admin = DeepbookAdminCap { id: object::new(ctx) };
    transfer::public_transfer(admin, ctx.sender());
}

// === Public Admin Functions ===
/// Sets the treasury address where the pool creation fees are sent
/// By default, the treasury address is the publisher of the deepbook package
// ... existing code ...

public fun set_treasury_address(
    _self: &mut Registry,
    _treasury_address: address,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

public fun enable_version(
    _self: &mut Registry,
    _version: u64,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

public fun disable_version(
    _self: &mut Registry,
    _version: u64,
    _cap: &DeepbookAdminCap,
) {
    abort 0
}

public(package) fun load_inner_mut(_self: &mut Registry): &mut RegistryInner {
    abort 0
}

public(package) fun register_pool<BaseAsset, QuoteAsset>(
    _self: &mut Registry,
    _pool_id: ID,
) {
    abort 0
}

public(package) fun unregister_pool<BaseAsset, QuoteAsset>(
    _self: &mut Registry,
) {
    abort 0
}

public(package) fun load_inner(_self: &Registry): &RegistryInner {
    abort 0
}

public(package) fun get_pool_id<BaseAsset, QuoteAsset>(_self: &Registry): ID {
    abort 0
}

public(package) fun treasury_address(_self: &Registry): address {
    abort 0
}

public(package) fun allowed_versions(_self: &Registry): VecSet<u64> {
    abort 0
}
