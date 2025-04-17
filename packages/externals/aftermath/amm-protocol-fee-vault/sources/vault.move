// Copyright (c) Aftermath Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0
#[allow(unused_field)]
module protocol_fee_vault::vault;

public struct ChangeFeeCap has key {
    id: sui::object::UID,
    last_used_epoch: u64,
}

public struct FeePercentages has store {
    total_protocol_fee: u64,
    treasury: u64,
    insurance_fund: u64,
    dev_wallet: u64,
    referee_discount: u64,
}

public struct ProtocolFeeVault has key, store {
    id: sui::object::UID,
    version: u64,
    dev_wallet: address,
    fee_percentages: FeePercentages,
}
