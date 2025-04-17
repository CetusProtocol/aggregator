module deepbookv3_vaults_v2::global_config;

use deepbookv3::balance_manager::{Self, BalanceManager, TradeCap};
use std::string::{Self, String};
use sui::balance::{Self, Balance};
use sui::table::{Self, Table};
use token::deep::DEEP;

// === Constants ===
// package version
const VERSION: u64 = 1;

const SPONSOR_FEE_RECORD_KEY: vector<u8> = b"sponsor_fee_record";

// === Errors ===
const EInsufficientDeepFee: u64 = 0;
const ENotAlternativePayment: u64 = 1;
const EPackageVersionDeprecate: u64 = 2;
const EOverSponsorLimit: u64 = 3;

// === Structs ===
public struct AdminCap has key, store {
    id: UID,
}

public struct GlobalConfig has key, store {
    id: UID,
    is_alternative_payment: bool,
    alternative_payment_amount: u64,
    trade_cap: TradeCap,
    balance_manager: BalanceManager,
    deep_fee_vault: Balance<DEEP>,
    whitelist: Table<ID, bool>,
    package_version: u64,
}

public struct SponsorFeeRecord has key, store {
    id: UID,
    sponsor_fee_records: Table<String, u64>,
    epoch_sponsor_fee_limit: u64,
    whitelist: Table<address, bool>,
}
