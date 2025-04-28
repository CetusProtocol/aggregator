module cetus_aggregator_v2::cetus;

use cetus_aggregator_v2::utils::transfer_or_destroy_coin;
use cetus_clmm::config::GlobalConfig;
use cetus_clmm::partner::Partner;
use cetus_clmm::pool::{Self, Pool, FlashSwapReceipt};
use cetus_clmm::tick_math;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

const DEFAULT_PARTNER_ID: address =
    @0x8e0b7668a79592f70fbfb1ae0aebaf9e2019a7049783b9a4b6fe7c6ae038b528;

public struct CetusSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    partner_id: ID,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    let amount_in = coin::value(&coin_a);
    let (receive_a, receive_b, flash_receipt, pay_amount) = flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        amount_in,
        true,
        true,
        tick_math::min_sqrt_price(),
        clock,
        ctx,
    );

    assert!(pay_amount == amount_in, 0);
    let remainer_a = repay_flash_swap_a2b<CoinA, CoinB>(
        config,
        pool,
        partner,
        coin_a,
        flash_receipt,
        ctx,
    );
    transfer_or_destroy_coin(remainer_a, ctx);
    coin::destroy_zero(receive_a);
    receive_b
}

public fun swap_b2a<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    let amount_in = coin::value(&coin_b);
    let (receive_a, receive_b, flash_receipt, pay_amount) = flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        amount_in,
        false,
        true,
        tick_math::max_sqrt_price(),
        clock,
        ctx,
    );

    assert!(pay_amount == amount_in, 0);
    coin::destroy_zero(receive_b);

    let remainer_b = repay_flash_swap_b2a<CoinA, CoinB>(
        config,
        pool,
        partner,
        coin_b,
        flash_receipt,
        ctx,
    );
    transfer_or_destroy_coin(remainer_b, ctx);
    receive_a
}

public fun flash_swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    amount: u64,
    by_amount_in: bool,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64) {
    let (coin_a, coin_b, flash_receipt, repay_amount) = flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        amount,
        true,
        by_amount_in,
        tick_math::min_sqrt_price(),
        clock,
        ctx,
    );
    transfer_or_destroy_coin<CoinA>(coin_a, ctx);
    (coin_b, flash_receipt, repay_amount)
}

public fun flash_swap_b2a<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &Partner,
    amount: u64,
    by_amount_in: bool,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<CoinA>, FlashSwapReceipt<CoinA, CoinB>, u64) {
    let (coin_a, coin_b, flash_receipt, repay_amount) = flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        amount,
        false,
        by_amount_in,
        tick_math::max_sqrt_price(),
        clock,
        ctx,
    );
    transfer_or_destroy_coin<CoinB>(coin_b, ctx);
    (coin_a, flash_receipt, repay_amount)
}

public fun repay_flash_swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_a: Coin<CoinA>,
    receipt: FlashSwapReceipt<CoinA, CoinB>,
    ctx: &mut TxContext,
): Coin<CoinA> {
    let coin_b = coin::zero<CoinB>(ctx);
    let (repaid_coin_a, repaid_coin_b) = repay_flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        true,
        coin_a,
        coin_b,
        receipt,
        ctx,
    );
    transfer_or_destroy_coin<CoinB>(repaid_coin_b, ctx);
    (repaid_coin_a)
}

public fun repay_flash_swap_b2a<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_b: Coin<CoinB>,
    receipt: FlashSwapReceipt<CoinA, CoinB>,
    ctx: &mut TxContext,
): Coin<CoinB> {
    let coin_a = coin::zero<CoinA>(ctx);
    let (repaid_coin_a, repaid_coin_b) = repay_flash_swap<CoinA, CoinB>(
        config,
        pool,
        partner,
        false,
        coin_a,
        coin_b,
        receipt,
        ctx,
    );

    transfer_or_destroy_coin<CoinA>(repaid_coin_a, ctx);
    (repaid_coin_b)
}

fun flash_swap<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &Partner,
    amount: u64,
    a2b: bool,
    by_amount_in: bool,
    sqrt_price_limit: u128,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<CoinA>, Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64) {
    let (receive_a, receive_b, flash_receipt) = if (
        object::id_address(partner) == DEFAULT_PARTNER_ID
    ) {
        pool::flash_swap<CoinA, CoinB>(
            config,
            pool,
            a2b,
            by_amount_in,
            amount,
            sqrt_price_limit,
            clock,
        )
    } else {
        pool::flash_swap_with_partner<CoinA, CoinB>(
            config,
            pool,
            partner,
            a2b,
            by_amount_in,
            amount,
            sqrt_price_limit,
            clock,
        )
    };

    let receive_a_amount = balance::value(&receive_a);
    let receive_b_amount = balance::value(&receive_b);
    let repay_amount = pool::swap_pay_amount(&flash_receipt);

    let amount_in = if (by_amount_in) {
        amount
    } else {
        repay_amount
    };
    let amount_out = receive_a_amount + receive_b_amount;

    emit(CetusSwapEvent {
        pool: object::id(pool),
        amount_in,
        amount_out,
        a2b,
        by_amount_in,
        partner_id: object::id(partner),
        coin_a: type_name::get<CoinA>(),
        coin_b: type_name::get<CoinB>(),
    });

    let coin_a = coin::from_balance(receive_a, ctx);
    let coin_b = coin::from_balance(receive_b, ctx);

    (coin_a, coin_b, flash_receipt, repay_amount)
}

fun repay_flash_swap<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    a2b: bool,
    coin_a: Coin<CoinA>,
    coin_b: Coin<CoinB>,
    receipt: FlashSwapReceipt<CoinA, CoinB>,
    ctx: &mut TxContext,
): (Coin<CoinA>, Coin<CoinB>) {
    let repay_amount = pool::swap_pay_amount(&receipt);

    let mut coin_a = coin_a;
    let mut coin_b = coin_b;
    let (pay_coin_a, pay_coin_b) = if (a2b) {
        (coin_a.split(repay_amount, ctx).into_balance(), balance::zero<CoinB>())
    } else {
        (balance::zero<CoinA>(), coin_b.split(repay_amount, ctx).into_balance())
    };

    if (object::id_address(partner) == DEFAULT_PARTNER_ID) {
        pool::repay_flash_swap<CoinA, CoinB>(
            config,
            pool,
            pay_coin_a,
            pay_coin_b,
            receipt,
        );
    } else {
        pool::repay_flash_swap_with_partner<CoinA, CoinB>(
            config,
            pool,
            partner,
            pay_coin_a,
            pay_coin_b,
            receipt,
        );
    };
    (coin_a, coin_b)
}
