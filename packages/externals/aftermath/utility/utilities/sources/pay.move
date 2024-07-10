// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module utilities::pay {
	public entry fun zero<T0>(
		_arg0: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public entry fun join_vec_and_split<T0>(
		_arg0: sui::coin::Coin<T0>,
		_arg1: vector<sui::coin::Coin<T0>>,
		_arg2: u64,
		_arg3: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}
}