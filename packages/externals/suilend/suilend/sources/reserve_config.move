/// parameters for a Reserve.
module suilend::reserve_config;

use sui::bag::Bag;

public struct ReserveConfig has store {
    // risk params
    open_ltv_pct: u8,
    close_ltv_pct: u8,
    max_close_ltv_pct: u8, // unused
    borrow_weight_bps: u64,
    // deposit limit in token amounts
    deposit_limit: u64,
    // borrow limit in token amounts
    borrow_limit: u64,
    // extra withdraw amount as bonus for liquidators
    liquidation_bonus_bps: u64,
    max_liquidation_bonus_bps: u64, // unused
    // deposit limit in usd
    deposit_limit_usd: u64,
    // borrow limit in usd
    borrow_limit_usd: u64,
    // interest params
    interest_rate_utils: vector<u8>,
    // in basis points
    interest_rate_aprs: vector<u64>,
    // fees
    borrow_fee_bps: u64,
    spread_fee_bps: u64,
    // extra withdraw amount as fee for protocol on liquidations
    protocol_liquidation_fee_bps: u64,
    // if true, the asset cannot be used as collateral
    // and can only be borrowed in isolation
    isolated: bool,
    // unused
    open_attributed_borrow_limit_usd: u64,
    close_attributed_borrow_limit_usd: u64,
    additional_fields: Bag,
}

public struct ReserveConfigBuilder has store {
    fields: Bag,
}
