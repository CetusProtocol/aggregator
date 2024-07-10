// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module linked_set::linked_set {
	struct Null has drop, store {
		dummy_field: bool
	}

	struct LinkedSet<T0: copy+ drop+ store> has store {
		contents: sui::linked_table::LinkedTable<T0, linked_set::linked_set::Null>
	}

	public fun empty<T0: copy+ drop+ store>(
		_arg0: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun from_vector<T0: copy+ drop+ store>(
		_arg0: &vector<T0>,
		_arg1: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun length<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>
	): u64
	{
		abort 0
	}

	public fun is_empty<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>
	): bool
	{
		abort 0
	}

	public fun contains<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	): bool
	{
		abort 0
	}

	public fun front<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>
	): &std::option::Option<T0>
	{
		abort 0
	}

	public fun back<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>
	): &std::option::Option<T0>
	{
		abort 0
	}

	public fun prev<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	): &std::option::Option<T0>
	{
		abort 0
	}

	public fun next<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	): &std::option::Option<T0>
	{
		abort 0
	}

	public fun into_vector<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>
	): vector<T0>
	{
		abort 0
	}

	public fun clone<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun partial_clone<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: u64,
		_arg2: bool,
		_arg3: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun push_front<T0: copy+ drop+ store>(
		_arg0: &mut linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	)
	{
		abort 0
	}

	public fun push_back<T0: copy+ drop+ store>(
		_arg0: &mut linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	)
	{
		abort 0
	}

	public fun pop_front<T0: copy+ drop+ store>(
		_arg0: &mut linked_set::linked_set::LinkedSet<T0>
	): T0
	{
		abort 0
	}

	public fun pop_back<T0: copy+ drop+ store>(
		_arg0: &mut linked_set::linked_set::LinkedSet<T0>
	): T0
	{
		abort 0
	}

	public fun remove<T0: copy+ drop+ store>(
		_arg0: &mut linked_set::linked_set::LinkedSet<T0>,
		_arg1: T0
	)
	{
		abort 0
	}

	public fun destroy_empty<T0: copy+ drop+ store>(
		_arg0: linked_set::linked_set::LinkedSet<T0>
	)
	{
		abort 0
	}

	public fun drop<T0: copy+ drop+ store>(
		_arg0: linked_set::linked_set::LinkedSet<T0>
	)
	{
		abort 0
	}

	public fun union<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: &linked_set::linked_set::LinkedSet<T0>,
		_arg2: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun intersection<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: &linked_set::linked_set::LinkedSet<T0>,
		_arg2: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}

	public fun difference<T0: copy+ drop+ store>(
		_arg0: &linked_set::linked_set::LinkedSet<T0>,
		_arg1: &linked_set::linked_set::LinkedSet<T0>,
		_arg2: &mut sui::tx_context::TxContext
	): linked_set::linked_set::LinkedSet<T0>
	{
		abort 0
	}
}
