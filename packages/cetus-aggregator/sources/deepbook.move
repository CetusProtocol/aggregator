module cetus_aggregator::deepbook {
    use std::type_name::{Self, TypeName};

    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event::emit;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    use deepbook::clob_v2::{Self, Pool};
    use deepbook::custodian_v2::AccountCap;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    // <<<<<<<<<<<<<<<<<<<<<<<< Error codes <<<<<<<<<<<<<<<<<<<<<<<<
    const EUnderAmountOutThreshold: u64 = 1;
    const EInsufficientBaseCoin: u64 = 2;
    const EInsufficientQuoteCoin: u64 = 3;

    const CLIENT_ID_BOND: u64 = 0;

    struct DeepbookSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        account_cap: ID,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB> (
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        coin_a: Coin<CoinA>,
        account_cap: &AccountCap,
        use_full_input_coin_amount: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinB>, u64, u64) {
        let coin_b = coin::zero<CoinB>(ctx);
        let (coin_a, coin_b, amount_in, amount_out) = swap(pool, true, amount, amount_limit, coin_a, coin_b, account_cap, use_full_input_coin_amount, clock, ctx);
        transfer_or_destroy_coin<CoinA>(coin_a, ctx);
        (coin_b, amount_in, amount_out)
    }

    public fun swap_b2a<CoinA, CoinB> (
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        coin_b: Coin<CoinB>,
        account_cap: &AccountCap,
        use_full_input_coin_amount: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, u64, u64) {
        let coin_a = coin::zero<CoinA>(ctx);
        let (coin_a, coin_b, amount_in, amount_out) = swap(pool, false, amount, amount_limit, coin_a, coin_b, account_cap, use_full_input_coin_amount, clock, ctx);
        transfer_or_destroy_coin<CoinB>(coin_b, ctx);
        (coin_a, amount_in, amount_out)
    }

    public fun swap<CoinA, CoinB> (
        pool: &mut Pool<CoinA, CoinB>,
        a2b: bool,
        amount: u64,
        amount_limit: u64,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        account_cap: &AccountCap,
        use_full_input_coin_amount: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, u64, u64) {
        let pure_coin_a_amount = coin::value(&coin_a);
        let pure_coin_b_amount = coin::value(&coin_b);

        if (use_full_input_coin_amount) {
            amount = if (a2b) pure_coin_a_amount else pure_coin_b_amount;
        };

        if (a2b) {
            let (receive_a, receive_b) = swap_base_to_quote<CoinA, CoinB>(pool, account_cap, amount, amount_limit, coin_a, coin_b, clock, ctx);

            let swaped_coin_a_amount = coin::value(&receive_a);
            let swaped_coin_b_amount = coin::value(&receive_b);

            let amount_in = if (a2b) pure_coin_a_amount - swaped_coin_a_amount else pure_coin_b_amount - swaped_coin_b_amount;
            let amount_out = if (a2b) swaped_coin_b_amount - pure_coin_b_amount else swaped_coin_a_amount - pure_coin_a_amount;

            emit(DeepbookSwapEvent {
                pool: object::id(pool),
                a2b,
                by_amount_in: true,
                amount_in,
                amount_out,
                account_cap: object::id(account_cap),
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });
            (receive_a, receive_b, amount_in, amount_out)
        } else {
            let (receive_a, receive_b) = swap_quote_to_base<CoinA, CoinB>(pool, account_cap, amount, amount_limit, coin_a, coin_b, clock, ctx);
            let swaped_coin_a_amount = coin::value(&receive_a);
            let swaped_coin_b_amount = coin::value(&receive_b);

            let amount_in = if (a2b) pure_coin_a_amount - swaped_coin_a_amount else pure_coin_b_amount - swaped_coin_b_amount;
            let amount_out = if (a2b) swaped_coin_b_amount - pure_coin_b_amount else swaped_coin_a_amount - pure_coin_a_amount;

            emit(DeepbookSwapEvent {
                pool: object::id(pool),
                a2b,
                by_amount_in: true,
                amount_in,
                amount_out,
                account_cap: object::id(account_cap),
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });
            (receive_a, receive_b, amount_in, amount_out)
        }
    }

    public fun swap_base_to_quote<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        account_cap: &AccountCap,
        amount: u64,
        amount_limit: u64,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        assert!(coin::value(&coin_a) >= amount, EInsufficientBaseCoin);

        let swap_coin_a = coin::split(&mut coin_a, amount, ctx);
        let swap_coin_b = coin::zero<CoinB>(ctx);

        // this method will sell all coin_a which you passed. so need to split this base coin first
        let (coin_a_result, coin_b_result, quote_amount) = clob_v2::swap_exact_base_for_quote<CoinA, CoinB>(
            pool,
            CLIENT_ID_BOND,
            account_cap,
            amount,
            swap_coin_a,
            swap_coin_b,
            clock,
            ctx
        );

        assert!(quote_amount >= amount_limit, EUnderAmountOutThreshold);

        coin::join(&mut coin_a, coin_a_result);
        coin::join(&mut coin_b, coin_b_result);
        (coin_a, coin_b)
    }

    public fun swap_quote_to_base<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        account_cap: &AccountCap,
        amount: u64,
        amount_limit: u64,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        assert!(coin::value(&coin_b) >= amount, EInsufficientQuoteCoin);

        let swap_coin_b = coin::split(&mut coin_b, amount, ctx);

        let (coin_a_result, coin_b_result, base_amount) = clob_v2::swap_exact_quote_for_base(
            pool,
            CLIENT_ID_BOND,
            account_cap,
            amount,
            clock,
            swap_coin_b,
            ctx
        );
        assert!(base_amount >= amount_limit, EUnderAmountOutThreshold);

        coin::join(&mut coin_a, coin_a_result);
        coin::join(&mut coin_b, coin_b_result);
        (coin_a, coin_b)
    }

    #[allow(lint(self_transfer))]
    public fun transfer_account_cap(account_cap: AccountCap, ctx: &TxContext) {
        transfer::public_transfer(account_cap, tx_context::sender(ctx))
    }
}

