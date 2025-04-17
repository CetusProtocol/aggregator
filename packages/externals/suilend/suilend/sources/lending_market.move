#[allow(unused_field)]
module suilend::lending_market;

use pyth::price_info::PriceInfoObject;
use std::ascii;
use std::type_name::TypeName;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::{Coin, CoinMetadata, TreasuryCap};
use sui::dynamic_field;
use sui::event;
use sui::object_table::ObjectTable;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;
use suilend::decimal::Decimal;
use suilend::obligation::Obligation;
use suilend::rate_limiter::RateLimiter;
use suilend::reserve::Reserve;

// === Structs ===
public struct LendingMarket<phantom P> has key, store {
    id: UID,
    version: u64,
    reserves: vector<Reserve<P>>,
    obligations: ObjectTable<ID, Obligation<P>>,
    // window duration is in seconds
    rate_limiter: RateLimiter,
    fee_receiver: address, // deprecated
    /// unused
    bad_debt_usd: Decimal,
    /// unused
    bad_debt_limit_usd: Decimal,
}

public struct LendingMarketOwnerCap<phantom P> has key, store {
    id: UID,
    lending_market_id: ID,
}

public struct ObligationOwnerCap<phantom P> has key, store {
    id: UID,
    obligation_id: ID,
}
