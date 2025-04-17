module deepbookv3_vaults::global_config;

use deepbookv3::balance_manager::{BalanceManager, TradeCap};
use deepbookv3::order_info::OrderInfo;
use deepbookv3::pool::Pool;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::table::Table;
use token::deep::DEEP;

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
