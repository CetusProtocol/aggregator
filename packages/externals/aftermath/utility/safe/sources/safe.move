// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

#[allow(unused_field)]
module safe::safe;

public struct Safe<T0> has key {
    id: sui::object::UID,
    owner_cap_id: sui::object::ID,
    authorized_object_id: std::option::Option<sui::object::ID>,
    obj: T0,
}
