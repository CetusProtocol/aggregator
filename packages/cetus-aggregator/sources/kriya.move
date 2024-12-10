module cetus_aggregator::kriya {
    use std::type_name::{Self, TypeName};

    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::tx_context::TxContext;

    use kriya_amm::spot_dex::{Pool, swap_token_x, swap_token_y};

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    struct KriyaSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let coin_b = coin::zero<CoinB>(ctx);
        let (coin_a, coin_b) = swap(
            pool,
            coin_a,
            coin_b,
            true,
            ctx,
        );
        transfer_or_destroy_coin<CoinA>(coin_a, ctx);
        coin_b
    }

    public fun swap_b2a<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let coin_a = coin::zero<CoinA>(ctx);
        let (coin_a, coin_b) = swap(
            pool,
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
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        a2b: bool,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        let pure_coin_a_amount = coin::value(&coin_a);
        let pure_coin_b_amount = coin::value(&coin_b);
        let amount_in = if (a2b) pure_coin_a_amount else pure_coin_b_amount;

        if (a2b) {
            let swap_coin_a = coin::split(&mut coin_a, amount_in, ctx);
            let received_b = swap_token_x<CoinA, CoinB>(
                pool,
                swap_coin_a,
                amount_in,
                0,
                ctx,
            );
            let amount_out = coin::value(&received_b);
            emit(KriyaSwapEvent {
                pool: object::id(pool),
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
            let received_a = swap_token_y<CoinA, CoinB>(
                pool,
                swap_coin_b,
                amount_in,
                0,
                ctx
            );
            let amount_out = coin::value(&received_a);
            emit(KriyaSwapEvent {
                pool: object::id(pool),
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
