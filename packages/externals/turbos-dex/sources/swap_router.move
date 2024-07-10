#[allow(unused_field, unused_use)]
module turbos_dex::swap_router {
    use std::vector;

    use sui::clock::Clock;
    use sui::coin::Coin;
    use sui::tx_context::TxContext;

    use turbos_dex::pool::{Pool, Versioned};


    public fun swap_a_b_with_return_<CoinA, CoinB, Fee>(
        _pool: &mut Pool<CoinA, CoinB, Fee>, 
        _coin_a: vector<Coin<CoinA>>, 
        _amount: u64, 
        _amount_limit: u64, 
        _sqrt_price_limit: u128, 
        _by_amount_in: bool, 
        _sender: address, 
        _time_out: u64, 
        _clock: &Clock, 
        _versioned: &Versioned,     
        _ctx: &mut TxContext
    ): (Coin<CoinB>, Coin<CoinA>) {
        abort 0
    }

    public fun swap_b_a_with_return_<CoinA, CoinB, Fee>(
        _pool: &mut Pool<CoinA, CoinB, Fee>, 
        _coin_b: vector<Coin<CoinB>>, 
        _amount: u64, 
        _amount_limit: u64, 
        _sqrt_price_limit: u128, 
        _by_amount_in: bool, 
        _sender: address, 
        _time_out: u64, 
        _clock: &Clock, 
        _versioned: &Versioned,     
        _ctx: &mut TxContext
    ): (Coin<CoinA>, Coin<CoinB>) {
        abort 0
    }
}
