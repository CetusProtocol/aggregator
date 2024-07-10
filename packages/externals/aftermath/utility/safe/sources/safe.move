// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module safe::safe {
	struct OwnerCap has key {
		id: sui::object::UID
	}

	struct Safe<T0> has key {
		id: sui::object::UID,
		owner_cap_id: sui::object::ID,
		authorized_object_id: std::option::Option<sui::object::ID>,
		obj: T0
	}

	public fun create<T0: store>(
		_arg0: T0,
		_arg1: std::option::Option<sui::object::ID>,
		_arg2: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public fun borrow_obj_mut<T0>(
		_arg0: &mut safe::safe::Safe<T0>,
		_arg1: &sui::object::UID
	): &mut T0
	{
		abort 0
	}

	public fun borrow_obj<T0>(
		_arg0: &safe::safe::Safe<T0>
	): &T0
	{
		abort 0
	}

	public fun assert_authorization<T0>(
		_arg0: &safe::safe::Safe<T0>,
		_arg1: sui::object::ID
	)
	{
		abort 0
	}

	public fun authorize<T0>(
		_arg0: &mut safe::safe::Safe<T0>,
		_arg1: &safe::safe::OwnerCap,
		_arg2: sui::object::ID
	)
	{
		abort 0
	}

	public fun revoke_auth<T0>(
		_arg0: &mut safe::safe::Safe<T0>,
		_arg1: &safe::safe::OwnerCap
	)
	{
		abort 0
	}
}
