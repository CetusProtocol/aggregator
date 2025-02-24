module cetus_aggregator_v2::steammfe;

use cetus_aggregator_v2::utils::transfer_or_destroy_coin;
use std::type_name::{Self, TypeName};
use steamm::bank::{Self, Bank};
use steamm::cpmm::{Self, CpQuoter};
use steamm::pool::Pool;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;
use suilend::lending_market::LendingMarket;

public struct SteammSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<LENGDING_MARKET, COIN_A, COIN_B, BCOIN_A, BCOIN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BCOIN_A, BCOIN_B, CpQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, COIN_A, BCOIN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, COIN_B, BCOIN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    coin_a: Coin<COIN_A>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_B> {
    let amount_in = coin::value(&coin_a);
    let coin_b = coin::zero<COIN_B>(ctx);
    let (out_coin_a, out_coin_b) = swap(
        pool,
        bank_a,
        bank_b,
        lending_market,
        coin_a,
        coin_b,
        true,
        clock,
        ctx,
    );
    let amount_out = coin::value(&out_coin_b);
    transfer_or_destroy_coin<COIN_A>(out_coin_a, ctx);
    emit(SteammSwapEvent {
        a2b: true,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<COIN_A>(),
        coin_b: type_name::get<COIN_B>(),
    });
    out_coin_b
}

public fun swap_b2a<LENGDING_MARKET, COIN_A, COIN_B, BCOIN_A, BCOIN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BCOIN_A, BCOIN_B, CpQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, COIN_A, BCOIN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, COIN_B, BCOIN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    coin_b: Coin<COIN_B>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_A> {
    let amount_in = coin::value(&coin_b);
    let coin_a = coin::zero<COIN_A>(ctx);
    let (out_coin_a, out_coin_b) = swap(
        pool,
        bank_a,
        bank_b,
        lending_market,
        coin_a,
        coin_b,
        false,
        clock,
        ctx,
    );
    let amount_out = coin::value(&out_coin_a);
    transfer_or_destroy_coin<COIN_B>(out_coin_b, ctx);
    emit(SteammSwapEvent {
        a2b: false,
        by_amount_in: true,
        amount_in,
        amount_out,
        coin_a: type_name::get<COIN_A>(),
        coin_b: type_name::get<COIN_B>(),
    });
    out_coin_a
}

public fun swap<LENGDING_MARKET, COIN_A, COIN_B, BCOIN_A, BCOIN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BCOIN_A, BCOIN_B, CpQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, COIN_A, BCOIN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, COIN_B, BCOIN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    coin_a: Coin<COIN_A>,
    coin_b: Coin<COIN_B>,
    a2b: bool,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<COIN_A>, Coin<COIN_B>) {
    let amount_in = if (a2b) { coin::value(&coin_a) } else { coin::value(&coin_b) };

    let balance_a = coin::into_balance(coin_a);
    let balance_b = coin::into_balance(coin_b);

    let mut swap_coin_a = coin::from_balance(balance_a, ctx);
    let mut swap_coin_b = coin::from_balance(balance_b, ctx);

    cpmm_swap(
        pool,
        bank_a,
        bank_b,
        lending_market,
        &mut swap_coin_a,
        &mut swap_coin_b,
        a2b,
        amount_in,
        0, // min_amount_out
        clock,
        ctx,
    );

    (swap_coin_a, swap_coin_b)
}

public fun cpmm_swap<LENGDING_MARKET, TOKEN_A, TOKEN_B, BTOKEN_A, BTOKEN_B, LP_TOKEN: drop>(
    pool: &mut Pool<BTOKEN_A, BTOKEN_B, CpQuoter, LP_TOKEN>,
    bank_a: &mut Bank<LENGDING_MARKET, TOKEN_A, BTOKEN_A>,
    bank_b: &mut Bank<LENGDING_MARKET, TOKEN_B, BTOKEN_B>,
    lending_market: &mut LendingMarket<LENGDING_MARKET>,
    coin_a: &mut Coin<TOKEN_A>,
    coin_b: &mut Coin<TOKEN_B>,
    a2b: bool,
    amount_in: u64,
    min_amount_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let (btoken_a, btoken_b) = if (a2b) {
        (
            bank::mint_btokens<LENGDING_MARKET, TOKEN_A, BTOKEN_A>(
                bank_a,
                lending_market,
                coin_a,
                amount_in,
                clock,
                ctx,
            ),
            coin::zero<BTOKEN_B>(ctx),
        )
    } else {
        (
            coin::zero<BTOKEN_A>(ctx),
            bank::mint_btokens<LENGDING_MARKET, TOKEN_B, BTOKEN_B>(
                bank_b,
                lending_market,
                coin_b,
                amount_in,
                clock,
                ctx,
            ),
        )
    };
    let mut swap_coin_a = btoken_a;
    let mut swap_coin_b = btoken_b;
    cpmm::swap<BTOKEN_A, BTOKEN_B, LP_TOKEN>(
        pool,
        &mut swap_coin_a,
        &mut swap_coin_b,
        a2b,
        amount_in,
        min_amount_out,
        ctx,
    );
    let bcoin_a_amount = coin::value<BTOKEN_A>(&swap_coin_a);
    let bcoin_b_amount = coin::value<BTOKEN_B>(&swap_coin_b);
    if (bcoin_a_amount > 0) {
        coin::join<TOKEN_A>(
            coin_a,
            bank::burn_btokens<LENGDING_MARKET, TOKEN_A, BTOKEN_A>(
                bank_a,
                lending_market,
                &mut swap_coin_a,
                bcoin_a_amount,
                clock,
                ctx,
            ),
        );
    };
    if (bcoin_b_amount > 0) {
        coin::join<TOKEN_B>(
            coin_b,
            bank::burn_btokens<LENGDING_MARKET, TOKEN_B, BTOKEN_B>(
                bank_b,
                lending_market,
                &mut swap_coin_b,
                bcoin_b_amount,
                clock,
                ctx,
            ),
        );
    };
    transfer_or_destroy_coin<BTOKEN_A>(swap_coin_a, ctx);
    transfer_or_destroy_coin<BTOKEN_B>(swap_coin_b, ctx);
}
