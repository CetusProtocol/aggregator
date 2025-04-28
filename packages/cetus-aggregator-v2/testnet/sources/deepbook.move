module cetus_aggregator_v2::deepbook;

use cetus_aggregator_v2::utils::transfer_or_destroy_coin;
use deepbook::clob_v2::{Self, Pool};
use deepbook::custodian_v2::AccountCap;
use std::type_name::{Self, TypeName};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

const CLIENT_ID_BOND: u64 = 0;

public struct DeepbookSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    account_cap: ID,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    account_cap: &AccountCap,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    let coin_b = coin::zero<CoinB>(ctx);
    let amount = coin::value(&coin_a);
    let (receive_a, receive_b, _) = clob_v2::swap_exact_base_for_quote<CoinA, CoinB>(
        pool,
        CLIENT_ID_BOND,
        account_cap,
        amount,
        coin_a,
        coin_b,
        clock,
        ctx,
    );

    let swaped_coin_a_amount = coin::value(&receive_a);
    let swaped_coin_b_amount = coin::value(&receive_b);

    let amount_in = amount - swaped_coin_a_amount;
    let amount_out = swaped_coin_b_amount;

    emit(DeepbookSwapEvent {
        pool: object::id(pool),
        a2b: true,
        by_amount_in: true,
        amount_in,
        amount_out,
        account_cap: object::id(account_cap),
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });

    transfer_or_destroy_coin<CoinA>(receive_a, ctx);
    receive_b
}

public fun swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    account_cap: &AccountCap,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    let amount = coin::value(&coin_b);
    let (receive_a, receive_b, _) = clob_v2::swap_exact_quote_for_base(
        pool,
        CLIENT_ID_BOND,
        account_cap,
        amount,
        clock,
        coin_b,
        ctx,
    );
    let swaped_coin_a_amount = coin::value(&receive_a);
    let swaped_coin_b_amount = coin::value(&receive_b);
    let amount_in = amount - swaped_coin_b_amount;
    let amount_out = swaped_coin_a_amount;
    emit(DeepbookSwapEvent {
        pool: object::id(pool),
        a2b: false,
        by_amount_in: true,
        amount_in,
        amount_out,
        account_cap: object::id(account_cap),
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });
    transfer_or_destroy_coin<CoinB>(receive_b, ctx);
    receive_a
}

#[allow(lint(self_transfer))]
public fun transfer_account_cap(account_cap: AccountCap, ctx: &TxContext) {
    transfer::public_transfer(account_cap, tx_context::sender(ctx))
}
