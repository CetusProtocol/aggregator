// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Deepbook utility functions.
#[allow(unused_field)]
module deepbookv3::utils;

/// Pop elements from the back of `v` until its length equals `n`,
/// returning the elements that were popped in the order they
/// appeared in `v`.
public(package) fun pop_until<T>(_v: &mut vector<T>, _n: u64): vector<T> {
    abort 0
}

public(package) fun pop_n<T>(_v: &mut vector<T>, _n: u64): vector<T> {
    abort 0
}

public(package) fun encode_order_id(
    _is_bid: bool,
    _price: u64,
    _order_id: u64,
): u128 {
    abort 0
}

public(package) fun decode_order_id(_encoded_order_id: u128): (bool, u64, u64) {
    abort 0
}
