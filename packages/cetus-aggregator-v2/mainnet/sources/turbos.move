module cetus_aggregator::turbos {
    use std::type_name::{Self, TypeName};

    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::clock::{Self, Clock};

    use turbos_dex::pool::{Pool, Versioned};
    use turbos_dex::swap_router::{swap_a_b_with_return_, swap_b_a_with_return_};

    use cetus_clmm::tick_math;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    public struct TurbosSwapEvent has copy, store, drop {
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
        clock: &Clock,
        versioned: &Versioned,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount_in = coin::value(&coin_a);
        let time_out = clock::timestamp_ms(clock) + 18000;
        let mut vec_swap_coin_a = vector::empty<Coin<CoinA>>();
        vec_swap_coin_a.push_back(coin_a);
        let (received_b, received_a) = swap_a_b_with_return_<CoinA, CoinB, Fee>(
            pool,
            vec_swap_coin_a,
            amount_in,
            0,
            tick_math::min_sqrt_price(),
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
            a2b: true,
            by_amount_in: true,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
            fee: type_name::get<Fee>(),
        });
        transfer_or_destroy_coin<CoinA>(received_a, ctx);
        received_b
    }

    public fun swap_b2a<CoinA, CoinB, Fee>(
        pool: &mut Pool<CoinA, CoinB, Fee>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        versioned: &Versioned,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount_in = coin::value(&coin_b);
        let time_out = clock::timestamp_ms(clock) + 18000;
        let mut vec_swap_coin_b = vector::empty<Coin<CoinB>>();
        vec_swap_coin_b.push_back(coin_b);
        let (received_a, received_b) = swap_b_a_with_return_<CoinA, CoinB, Fee>(
            pool,
            vec_swap_coin_b,
            amount_in,
            0,
            tick_math::max_sqrt_price(),
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
            a2b: false,
            by_amount_in: true,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
            fee: type_name::get<Fee>(),
        });
        transfer_or_destroy_coin<CoinB>(received_b, ctx);
        received_a
    }
}
