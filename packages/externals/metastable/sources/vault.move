#[allow(unused_field)]
module aftermath_mstable::vault;

use aftermath_mstable::version::Version;
use sui::balance::Supply;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;
use sui::object::{UID, ID};
use sui::object_bag::ObjectBag;

public struct Vault<phantom T0> has key {
    id: UID,
    supply: Supply<T0>,
    meta_coin_decimals: u8,
    active_assistant_cap: ID,
    metadata: ObjectBag,
    total_priorities: u64,
    funds: ObjectBag,
    fees: ObjectBag,
}

public struct DepositCap<phantom T0, phantom T1> {
    exchange_rate_meta_coin_to_coin_in: u128,
}

public struct WithdrawCap<phantom T0, phantom T1> {
    exchange_rate_meta_coin_to_coin_out: u128,
}
