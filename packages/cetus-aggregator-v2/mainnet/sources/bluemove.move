module cetus_aggregator::bluemove {
    use std::type_name::{Self, TypeName};
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use bluemove::router::swap_exact_input_;
    use bluemove::swap::Dex_Info;

    public struct BlueMoveSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB>(
        dex_info: &mut Dex_Info,
        coin_a: Coin<CoinA>,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount_in = coin::value(&coin_a);
        let coin_b = swap_exact_input_<CoinA, CoinB>(
            amount_in,
            coin_a,
            0,
            dex_info,
            ctx,
        );
        let amount_out = coin::value(&coin_b);
        emit(BlueMoveSwapEvent {
            amount_in,
            amount_out,
            a2b: true,
            by_amount_in: true,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        coin_b
    }

    public fun swap_b2a<CoinA, CoinB>(
        dex_info: &mut Dex_Info,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount_in = coin::value(&coin_b);
        let coin_a = swap_exact_input_<CoinB, CoinA>(
            amount_in,
            coin_b,
            0,
            dex_info,
            ctx,
        );
        let amount_out = coin::value(&coin_a);
        emit(BlueMoveSwapEvent {
            amount_in,
            amount_out,
            a2b: false,
            by_amount_in: false,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        coin_a
    }
}
