// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

module aftermath_amm::swap {
	public fun swap_exact_in<T0, T1, T2>(
		_arg0: &mut aftermath_amm::pool::Pool<T0>,
		_arg1: &aftermath_amm::pool_registry::PoolRegistry,
		_arg2: &protocol_fee_vault::vault::ProtocolFeeVault,
		_arg3: &mut treasury::treasury::Treasury,
		_arg4: &mut insurance_fund::insurance_fund::InsuranceFund,
		_arg5: &referral_vault::referral_vault::ReferralVault,
		_arg6: sui::coin::Coin<T1>,
		_arg7: u64,
		_arg8: u64,
		_arg9: &mut sui::tx_context::TxContext
	): sui::coin::Coin<T2>
	{
		abort 0
	}
}
