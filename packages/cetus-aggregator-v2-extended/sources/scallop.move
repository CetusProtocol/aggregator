module cetus_aggregator_v2::scallop {
    use protocol::mint::mint;
    use protocol::redeem::redeem;
    use protocol::market::Market;
    use protocol::version::Version;
    use scallop_scoin::s_coin_converter::{mint_s_coin, burn_s_coin, SCoinTreasury};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use std::type_name::{Self, TypeName};
    use sui::event::emit;

    public struct ScallopSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    // mint s_coin: coin -> s_coin
    public fun swap_a2b<CoinA, CoinB> (
        version: &Version,
        market: &mut Market,
        treasury: &mut SCoinTreasury<CoinB, CoinA>,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount_in = coin::value(&coin_a);
        let market_coin_a = mint<CoinA>(version, market, coin_a, clock, ctx);
        let s_coin = mint_s_coin<CoinB, CoinA>(treasury, market_coin_a, ctx);
        let amount_out = coin::value(&s_coin);
        emit(ScallopSwapEvent {
            a2b: true,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        s_coin
    }

    // redeem s_coin: s_coin -> coin
    public fun swap_b2a<CoinB, CoinA> (
        version: &Version,
        market: &mut Market,
        treasury: &mut SCoinTreasury<CoinB, CoinA>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount_in = coin::value(&coin_b);
        let market_coin_b = burn_s_coin<CoinB, CoinA>(treasury, coin_b, ctx);
        let coin_a = redeem<CoinA>(version, market, market_coin_b, clock, ctx);
        let amount_out = coin::value(&coin_a);
        emit(ScallopSwapEvent {
            a2b: false,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });
        coin_a
    }
}
