// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// `Balances` represents the three assets make up a pool: base, quote, and
/// deep. Whenever funds are moved, they are moved in the form of `Balances`.
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::balances;

// === Structs ===
public struct Balances has copy, drop, store {
    base: u64,
    quote: u64,
    deep: u64,
}
