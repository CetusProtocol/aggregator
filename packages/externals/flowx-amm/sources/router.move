#[allow(unused_variable)]
module flowx_amm::router {
    use sui::coin::Coin;
    use sui::tx_context::TxContext;

    use flowx_amm::factory::Container;

    public fun swap_exact_input_direct<CoinA, CoinB>(container: &mut Container, coin_a: Coin<CoinA>, ctx: &mut TxContext) : Coin<CoinB> {
        abort 0      
    }
}
