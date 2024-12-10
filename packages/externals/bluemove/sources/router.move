/// Module: router
module bluemove::router {

    use sui::coin::Coin;
    use sui::tx_context::TxContext;
    use bluemove::swap::Dex_Info;

    public fun swap_exact_input_<Ty0, Ty1>(
        _arg0: u64,
        _arg1: Coin<Ty0>,
        _arg2: u64,
        _arg3: &mut Dex_Info,
        _arg4: &mut TxContext
    ): Coin<Ty1> {
        abort 1
    }

    public fun swap_exact_output_<Ty0, Ty1>(
        _rg0: u64,
        _rg1: u64,
        _rg2: Coin<Ty0>,
        _rg3: &mut Dex_Info,
        _rg4: &mut TxContext
    ): Coin<Ty1> {
        abort 1
    }
}
