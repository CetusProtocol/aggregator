module cetus_aggregator_v2::deepbookv3 {
    use std::type_name::{Self, TypeName};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event::emit;

    use deepbookv3_vaults::deepbook_v3::{swap_a2b_, swap_b2a_};
    use deepbookv3_vaults::global_config::GlobalConfig;
    use deepbookv3::pool::Pool;
    use token::deep::DEEP;

   public struct DeepbookV3SwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB> (
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount = coin::value(&coin_a);
        let (returned_coin_a, coin_b, returned_deep) = swap_a2b_<CoinA, CoinB>(config, pool, coin_a, coin_deep, clock, ctx);
        let amount_in = amount - coin::value(&returned_coin_a);
        let amount_out = coin::value(&coin_b);

        emit(DeepbookV3SwapEvent {
            pool: object::id(pool),
            a2b: true,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        transfer_or_destroy_coin<CoinA>(returned_coin_a, ctx);
        transfer_or_destroy_coin<DEEP>(returned_deep, ctx);
        coin_b
    }

    public fun swap_b2a<CoinA, CoinB> (
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount = coin::value(&coin_b);
        let (coin_a, returned_coin_b, returned_deep) = swap_b2a_<CoinA, CoinB>(config, pool, coin_b, coin_deep, clock, ctx);
        let amount_in = amount - coin::value(&returned_coin_b);
        let amount_out = coin::value(&coin_a);

        emit(DeepbookV3SwapEvent {
            pool: object::id(pool),
            a2b: false,
            by_amount_in: false,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        transfer_or_destroy_coin<CoinB>(returned_coin_b, ctx);
        transfer_or_destroy_coin<DEEP>(returned_deep, ctx);
        coin_a
    }

    #[allow(lint(self_transfer))]
    public fun transfer_or_destroy_coin<CoinType>(
        coin: Coin<CoinType>,
        ctx: &TxContext
    ) {
        if (coin::value(&coin) > 0) {
            transfer::public_transfer(coin, tx_context::sender(ctx))
        } else {
            coin::destroy_zero(coin)
        }
    }
}
