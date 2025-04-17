#[allow(unused_field, unused_variable)]
module steamm::bank;

use steamm::version::Version;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::Coin;
use suilend::lending_market::{ObligationOwnerCap, LendingMarket};

public struct Bank<phantom T0, phantom T1, phantom T2> has key {
    id: UID,
    funds_available: Balance<T1>,
    lending: Option<Lending<T0>>,
    min_token_block_size: u64,
    btoken_supply: Balance<T2>,
    version: Version,
}

public struct Lending<phantom T0> has store {
    ctokens: u64,
    target_utilisation_bps: u16,
    utilisation_buffer_bps: u16,
    reserve_array_index: u64,
    obligation_cap: ObligationOwnerCap<T0>,
}
