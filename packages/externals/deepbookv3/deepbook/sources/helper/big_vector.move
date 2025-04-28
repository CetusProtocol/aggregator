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
#[allow(unused_variable, unused_const, unused_use)]
module deepbookv3::big_vector;

use sui::dynamic_field as df;

use fun sui::object::new as TxContext.new;

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
public struct Slice<E: store> has drop, store {
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
