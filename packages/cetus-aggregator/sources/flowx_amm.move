module cetus_aggregator::flowx_amm {
    use std::type_name::{Self, TypeName};

    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::tx_context::TxContext;

    use flowx_amm::router::swap_exact_input_direct;
    use flowx_amm::factory::Container;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    struct FlowxSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB>(
        container: &mut Container,
        coin_a: Coin<CoinA>,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let coin_b = coin::zero<CoinB>(ctx);
        let (coin_a, coin_b) = swap(
            container,
            coin_a,
            coin_b,
            true,
            ctx,
        );
        transfer_or_destroy_coin<CoinA>(coin_a, ctx);
        coin_b
    }

    public fun swap_b2a<CoinA, CoinB>(
        container: &mut Container,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let coin_a = coin::zero<CoinA>(ctx);
        let (coin_a, coin_b) = swap(
            container,
            coin_a,
            coin_b,
            false,
            ctx,
        );
        transfer_or_destroy_coin<CoinB>(coin_b, ctx);
        coin_a
    }

    #[allow(unused_assignment)]
    fun swap<CoinA, CoinB>(
        container: &mut Container, 
        coin_a: Coin<CoinA>, 
        coin_b: Coin<CoinB>,
        a2b: bool,
        ctx: &mut TxContext
    ): (Coin<CoinA>, Coin<CoinB>) {
        let pure_coin_a_amount = coin::value(&coin_a);
        let pure_coin_b_amount = coin::value(&coin_b);
        let amount_in = if (a2b) pure_coin_a_amount else pure_coin_b_amount;

        if (a2b) {
            let swap_coin_a = coin::split(&mut coin_a, amount_in, ctx);
            let received_b = swap_exact_input_direct<CoinA, CoinB>(
                container,
                swap_coin_a,
                ctx,
            );
            let amount_out = coin::value(&received_b);
            emit(FlowxSwapEvent {
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });

            coin::join(&mut coin_b, received_b);
        } else {
            let swap_coin_b = coin::split(&mut coin_b, amount_in, ctx);
            let received_a = swap_exact_input_direct<CoinB, CoinA>(
                container,
                swap_coin_b,
                ctx
            );
            let amount_out = coin::value(&received_a);
            emit(FlowxSwapEvent {
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });

            coin::join(&mut coin_a, received_a);
        };
        (coin_a, coin_b)
    }
}
