module cetus_aggregator::turbos {
    use std::type_name::{Self, TypeName};
    use std::vector;

    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};

    use turbos_dex::pool::{Pool, Versioned};
    use turbos_dex::swap_router::{swap_a_b_with_return_, swap_b_a_with_return_};

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    struct TurbosSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
        fee: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB, Fee>(
        pool: &mut Pool<CoinA, CoinB, Fee>,
        coin_a: Coin<CoinA>,
        sqrt_price_limit: u128,
        clock: &Clock,
        versioned: &Versioned,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let coin_b = coin::zero<CoinB>(ctx);
        let (coin_a, coin_b) = swap(
            pool,
            coin_a,
            coin_b,
            true,
            sqrt_price_limit,
            clock,
            versioned,
            ctx,
        );
        transfer_or_destroy_coin<CoinA>(coin_a, ctx);
        coin_b
    }

    public fun swap_b2a<CoinA, CoinB, Fee>(
        pool: &mut Pool<CoinA, CoinB, Fee>,
        coin_b: Coin<CoinB>,
        sqrt_price_limit: u128,
        clock: &Clock,
        versioned: &Versioned,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let coin_a = coin::zero<CoinA>(ctx);
        let (coin_a, coin_b) = swap(
            pool,
            coin_a,
            coin_b,
            false,
            sqrt_price_limit,
            clock,
            versioned,
            ctx,
        );
        transfer_or_destroy_coin<CoinB>(coin_b, ctx);
        coin_a
    }

    #[allow(unused_assignment)]
    fun swap<CoinA, CoinB, Fee>(
        pool: &mut Pool<CoinA, CoinB, Fee>,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        a2b: bool,
        sqrt_price_limit: u128,
        clock: &Clock,
        versioned: &Versioned,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        let pure_coin_a_amount = coin::value(&coin_a);
        let pure_coin_b_amount = coin::value(&coin_b);
        let amount_in = if (a2b) pure_coin_a_amount else pure_coin_b_amount;
        // 3 mins
        let time_out = clock::timestamp_ms(clock) + 18000;

        if (a2b) {
            let swap_coin_a = coin::split(&mut coin_a, amount_in, ctx);
            let vec_swap_coin_a = vector::empty<Coin<CoinA>>();
            vector::push_back(&mut vec_swap_coin_a, swap_coin_a);

            let (received_b, received_a) = swap_a_b_with_return_<CoinA, CoinB, Fee>(
                pool,
                vec_swap_coin_a,
                amount_in,
                0,
                sqrt_price_limit,
                true,
                tx_context::sender(ctx),
                time_out,
                clock,
                versioned,
                ctx,
            );

            let amount_out = coin::value(&received_b);

            emit(TurbosSwapEvent {
                pool: object::id(pool),
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
                fee: type_name::get<Fee>(),
            });
            coin::join(&mut coin_a, received_a);
            coin::join(&mut coin_b, received_b);
        } else {
            let swap_coin_b = coin::split(&mut coin_b, amount_in, ctx);
            let vec_swap_coin_b = vector::empty<Coin<CoinB>>();
            vector::push_back(&mut vec_swap_coin_b, swap_coin_b);
            let (received_a, received_b) = swap_b_a_with_return_<CoinA, CoinB, Fee>(
                pool,
                vec_swap_coin_b,
                amount_in,
                0,
                sqrt_price_limit,
                true,
                tx_context::sender(ctx),
                time_out,
                clock,
                versioned,
                ctx
            );
            let amount_out = coin::value(&received_a);
            emit(TurbosSwapEvent {
                pool: object::id(pool),
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
                fee: type_name::get<Fee>(),
            });

            coin::join(&mut coin_a, received_a);
            coin::join(&mut coin_b, received_b);
        };
        (coin_a, coin_b)
    }
}
