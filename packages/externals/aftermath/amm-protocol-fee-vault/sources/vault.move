// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module protocol_fee_vault::vault {
	struct ChangeFeeCap has key {
		id: sui::object::UID,
		last_used_epoch: u64
	}

	struct FeePercentages has store {
		total_protocol_fee: u64,
		treasury: u64,
		insurance_fund: u64,
		dev_wallet: u64,
		referee_discount: u64
	}

	struct ProtocolFeeVault has store, key {
		id: sui::object::UID,
		version: u64,
		dev_wallet: address,
		fee_percentages: protocol_fee_vault::vault::FeePercentages
	}

	public fun transfer(
		_arg0: protocol_fee_vault::vault::ChangeFeeCap,
		_arg1: address
	)
	{
		abort 0
	}

	fun init(
		_arg0: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public fun total_protocol_fee(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	): u64
	{
		abort 0
	}

	public fun treasury_fee(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	): u64
	{
		abort 0
	}

	public fun insurance_fund_fee(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	): u64
	{
		abort 0
	}

	public fun dev_wallet_fee(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	): u64
	{
		abort 0
	}

	public fun referee_discount(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	): u64
	{
		abort 0
	}

	public fun collect_fees<T0>(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault,
		_arg1: &mut treasury::treasury::Treasury,
		_arg2: &mut insurance_fund::insurance_fund::InsuranceFund,
		_arg3: &referral_vault::referral_vault::ReferralVault,
		_arg4: &mut sui::coin::Coin<T0>,
		_arg5: address,
		_arg6: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public fun minimum_before_fees(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault,
		_arg1: u64
	): u64
	{
		abort 0
	}

	public entry fun update_dev_wallet_address(
		_arg0: &mut protocol_fee_vault::vault::ProtocolFeeVault,
		_arg1: address,
		_arg2: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public entry fun change_fee_percentages(
		_arg0: &mut protocol_fee_vault::vault::ChangeFeeCap,
		_arg1: &mut protocol_fee_vault::vault::ProtocolFeeVault,
		_arg2: std::option::Option<u64>,
		_arg3: std::option::Option<u64>,
		_arg4: std::option::Option<u64>,
		_arg5: std::option::Option<u64>,
		_arg6: std::option::Option<u64>,
		_arg7: &mut sui::tx_context::TxContext
	)
	{
		abort 0
	}

	public fun assert_version(
		_arg0: &protocol_fee_vault::vault::ProtocolFeeVault
	)
	{
		abort 0
	}
}
