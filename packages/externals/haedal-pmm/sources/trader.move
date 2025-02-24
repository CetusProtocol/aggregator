module haedal_pmm::trader;

use haedal_pmm::oracle_driven_pool::Pool;
use pyth::price_info::PriceInfoObject;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::event;

public fun sell_base_coin<CoinTypeBase, CoinTypeQuote>(
    pool: &mut Pool<CoinTypeBase, CoinTypeQuote>,
    clock: &Clock,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    base_coin: &mut Coin<CoinTypeBase>,
    amount: u64,
    min_receive_quote: u64,
    ctx: &mut TxContext,
): Coin<CoinTypeQuote> {
    abort 0
}

public fun sell_quote_coin<CoinTypeBase, CoinTypeQuote>(
    pool: &mut Pool<CoinTypeBase, CoinTypeQuote>,
    clock: &Clock,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    quote_coin: &mut Coin<CoinTypeQuote>,
    amount: u64,
    min_receive_base: u64,
    ctx: &mut TxContext,
): Coin<CoinTypeBase> {
    abort 0
}
