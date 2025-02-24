// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// `Balances` represents the three assets make up a pool: base, quote, and deep.
/// Whenever funds are moved, they are moved in the form of `Balances`.
#[allow(unused_field)]
module deepbookv3::balances;

// === Structs ===
public struct Balances has store, copy, drop {
    base: u64,
    quote: u64,
    deep: u64,
}

// === Public-Package Functions ===
// ... existing code ...

public(package) fun empty(): Balances {
    abort 0
}

public(package) fun new(_base: u64, _quote: u64, _deep: u64): Balances {
    abort 0
}

public(package) fun reset(_balances: &mut Balances): Balances {
    abort 0
}

public(package) fun add_balances(_balances: &mut Balances, _other: Balances) {
    abort 0
}

public(package) fun add_base(_balances: &mut Balances, _base: u64) {
    abort 0
}

public(package) fun add_quote(_balances: &mut Balances, _quote: u64) {
    abort 0
}

public(package) fun add_deep(_balances: &mut Balances, _deep: u64) {
    abort 0
}

public(package) fun base(_balances: &Balances): u64 {
    abort 0
}

public(package) fun quote(_balances: &Balances): u64 {
    abort 0
}

public(package) fun deep(_balances: &Balances): u64 {
    abort 0
}

