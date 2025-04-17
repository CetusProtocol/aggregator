#[allow(unused_field)]
module haedal_pmm::oracle_driven_pool;

use std::string::String;
use sui::balance::{Self, Supply, Balance};

public enum RStatus has copy, drop, store {
    ONE,
    ABOVE_ONE,
    BELOW_ONE,
}

public struct Pool<phantom CoinTypeBase, phantom CoinTypeQuote> has key {
    id: UID,
    version: u64,
    controls: PoolControls,
    maintainer: address, // maintainer, collect maintainer fee to buy food for Haedal
    oracle_config: PoolOracleConfig,
    base_coin_decimals: u8, // base coin decimals
    quote_coin_decimals: u8, // quote coin decimals
    lp_fee_rate: u64, // lp fee rate
    protocol_fee_rate: u64, // protocol fee rate
    core_data: PoolCoreData,
    coins: PoolCoins<CoinTypeBase, CoinTypeQuote>,
    settlement: PoolSettlement,
    tx_data: PoolTxData, // tx data
}

public struct PoolControls has store {
    closed: bool, // is closed
    deposit_base_allowed: bool, // is allowed to deposit base
    deposit_quote_allowed: bool, // is allowed to deposit quote
    trade_allowed: bool, // is allowed to trade
    buying_allowed: bool, // is allowed to buy
    selling_allowed: bool, // is allowed to sell
    base_balance_limit: u64, // base balance limit
    quote_balance_limit: u64, // quote balance limit
}

public struct PoolOracleConfig has store {
    base_price_id: vector<u8>, // pyth base price oracle id
    quote_price_id: vector<u8>, // pyth quote price oracle id
    base_usd_price_age: u64, // base / usd price age
    quote_usd_price_age: u64, // quote / usd price age
}

public struct PoolSettlement has store {
    base_capital_receive_quote: u64, // base capital receive quote
    quote_capital_receive_base: u64, // quote capital receive base
}

public struct PoolTxData has store {
    // ============ prev price cache ============
    base_usd_price: u64, // base / usd price
    quote_usd_price: u64, // quote / usd price
    base_quote_price: u64, // base / quote price
    // ============ index data ============
    trade_num: u64, // trade num
    liquidity_change_num: u64, // liquidity change num
}

public struct PoolCoins<phantom CoinTypeBase, phantom CoinTypeQuote> has store {
    base_coin: Balance<CoinTypeBase>, // base coin balance
    quote_coin: Balance<CoinTypeQuote>, // quote coin balance
    base_capital_coin_supply: Supply<BasePoolLiquidityCoin<CoinTypeBase, CoinTypeQuote>>, // base capital coin supply
    quote_capital_coin_supply: Supply<QuotePoolLiquidityCoin<CoinTypeBase, CoinTypeQuote>>, // quote capital coin supply
}

public struct PoolCoreData has store {
    k: u64, // k value, slippage, k / 1e9
    r_status: RStatus, // r status
    target_base_coin_amount: u64, // target base coin amount
    target_quote_coin_amount: u64, // target quote coin amount
    base_balance: u64, // base balance
    quote_balance: u64, // quote balance
}

public struct BasePoolLiquidityCoin<phantom BaseCoinType, phantom QuoteCoinType> has drop {}
public struct QuotePoolLiquidityCoin<phantom BaseCoinType, phantom QuoteCoinType> has drop {}
