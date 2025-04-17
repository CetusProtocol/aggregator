#[allow(unused_field)]
module scallop_scoin::s_coin_converter;

use protocol::reserve::MarketCoin;
use sui::balance::{Balance, Supply};
use sui::object::UID;

public struct SCoinTreasury<phantom T0, phantom T1> has key {
    id: UID,
    s_coin_supply: Supply<T0>,
    market_coin_balance: Balance<MarketCoin<T1>>,
}
