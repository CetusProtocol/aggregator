// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// BigVector is an arbitrary sized vector-like data structure,
/// implemented using an on-chain B+ Tree to support almost constant
/// time (log base max_fan_out) random access, insertion and removal.
///
/// Iteration is supported by exposing access to leaf nodes (slices).
/// Finding the initial slice can be done in almost constant time, and
/// subsequently finding the previous or next slice can also be done
/// in constant time.
///
/// Nodes in the B+ Tree are stored as individual dynamic fields
/// hanging off the `BigVector`.
///
/// Note: The index type is `u128`, but the length is stored as `u64`
/// because the expectation is that indices are sparsely distributed.
#[allow(unused_field)]
module deepbookv3::big_vector;

public struct BigVector<phantom E: store> has key, store {
    id: UID,
    /// How deep the tree structure is.
    depth: u8,
    /// Total number of elements that this vector contains, not
    /// including gaps in the vector.
    length: u64,
    /// Max size of leaf nodes (counted in number of elements, `E`).
    max_slice_size: u64,
    /// Max size of interior nodes (counted in number of children).
    max_fan_out: u64,
    /// ID of the tree's root structure. Value of `NO_SLICE` means
    /// there's no root.
    root_id: u64,
    /// The last node ID that was allocated.
    last_id: u64,
}

/// A node in the B+ tree.
///
/// If representing a leaf node, there are as many keys as values
/// (such that `keys[i]` is the key corresponding to `vals[i]`).
///
/// A `Slice<u64>` can also represent an interior node, in which
/// case `vals` contain the IDs of its children and `keys`
/// represent the partitions between children. There will be one
/// fewer key than value in this configuration.
public struct Slice<E: store> has store, drop {
    /// Previous node in the intrusive doubly-linked list data
    /// structure.
    prev: u64,
    /// Next node in the intrusive doubly-linked list data
    /// structure.
    next: u64,
    keys: vector<u128>,
    vals: vector<E>,
}

/// Wrapper type around indices for slices. The internal index is
/// the ID of the dynamic field containing the slice.
public struct SliceRef has copy, drop, store { ix: u64 }


// === Constructors ===

/// Construct a new, empty `BigVector`. `max_slice_size` contains
/// the maximum size of its leaf nodes, and `max_fan_out` contains
/// the maximum fan-out of its interior nodes.
// ... existing code ...

public(package) fun empty<E: store>(
    _max_slice_size: u64,
    _max_fan_out: u64,
    _ctx: &mut TxContext,
): BigVector<E> {
    abort 0
}

public(package) fun destroy_empty<E: store>(_self: BigVector<E>) {
    abort 0
}

public(package) fun is_empty<E: store>(_self: &BigVector<E>): bool {
    abort 0
}

public(package) fun length<E: store>(_self: &BigVector<E>): u64 {
    abort 0
}

public(package) fun depth<E: store>(_self: &BigVector<E>): u8 {
    abort 0
}

public(package) fun borrow<E: store>(
    _self: &BigVector<E>,
    _ix: u128,
): &E {
    abort 0
}

public(package) fun borrow_mut<E: store>(
    _self: &mut BigVector<E>,
    _ix: u128,
): &mut E {
    abort 0
}

public(package) fun insert<E: store>(
    _self: &mut BigVector<E>,
    _key: u128,
    _val: E,
) {
    abort 0
}

public(package) fun remove<E: store>(
    _self: &mut BigVector<E>,
    _key: u128,
): E {
    abort 0
}

public(package) fun remove_batch<E: store>(
    _self: &mut BigVector<E>,
    _keys: vector<u128>,
): vector<E> {
    abort 0
}

public(package) fun slice_around<E: store>(
    _self: &BigVector<E>,
    _key: u128,
): (SliceRef, u64) {
    abort 0
}

public(package) fun slice_following<E: store>(
    _self: &BigVector<E>,
    _key: u128,
): (SliceRef, u64) {
    abort 0
}

public(package) fun slice_before<E: store>(
    _self: &BigVector<E>,
    _key: u128,
): (SliceRef, u64) {
    abort 0
}

public(package) fun min_slice<E: store>(_self: &BigVector<E>): (SliceRef, u64) {
    abort 0
}

public(package) fun max_slice<E: store>(_self: &BigVector<E>): (SliceRef, u64) {
    abort 0
}

public(package) fun next_slice<E: store>(
    _self: &BigVector<E>,
    _ref: SliceRef,
    _offset: u64,
): (SliceRef, u64) {
    abort 0
}

public(package) fun prev_slice<E: store>(
    _self: &BigVector<E>,
    _ref: SliceRef,
    _offset: u64,
): (SliceRef, u64) {
    abort 0
}

public(package) fun borrow_slice<E: store>(
    _self: &BigVector<E>,
    _ref: SliceRef,
): &Slice<E> {
    abort 0
}

public(package) fun borrow_slice_mut<E: store>(
    _self: &mut BigVector<E>,
    _ref: SliceRef,
): &mut Slice<E> {
    abort 0
}

