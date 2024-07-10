// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module sui_system_utils::sui_system_utils {
	public fun calculate_rewards_at_epoch(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: &sui_system::staking_pool::StakedSui,
		_arg2: u64
	): u64
	{
		abort 0
	}

	public fun calculate_rewards(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: &sui_system::staking_pool::StakedSui,
		_arg2: &sui::tx_context::TxContext
	): u64
	{
		abort 0
	}

	public fun staked_sui_principal_and_rewards(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: &sui_system::staking_pool::StakedSui,
		_arg2: &sui::tx_context::TxContext
	): (u64, u64)
	{
		abort 0
	}

	public fun request_withdraw_stake_vec_non_entry(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: vector<sui_system::staking_pool::StakedSui>,
		_arg2: &mut sui::tx_context::TxContext
	): sui::balance::Balance<sui::sui::SUI>
	{
		abort 0
	}

	public fun is_validator_active(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: &address
	): bool
	{
		abort 0
	}

	public fun pool_token_exchange_rate_at_epoch(
		_arg0: &mut sui_system::sui_system::SuiSystemState,
		_arg1: &sui_system::staking_pool::StakedSui,
		_arg2: u64
	): sui_system::staking_pool::PoolTokenExchangeRate
	{
		abort 0
	}
}
