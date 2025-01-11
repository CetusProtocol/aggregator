module deepbookv3_vaults::deepbook_v3 {
    use std::type_name::{Self, TypeName};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event::emit;

    use deepbookv3::pool::{swap_exact_base_for_quote, swap_exact_quote_for_base, get_base_quantity_out, get_quote_quantity_out, Pool};
    use deepbookv3::balance_manager::BalanceManager;
    use deepbookv3::order_info::OrderInfo;

    use token::deep::DEEP;

    use deepbookv3_vaults::global_config::{GlobalConfig, place_market_order_by_user_bm};

    // === Constants ===
    const CLIENT_ID_CETUS: u64 = 1107;

    // === Errors ===
    const ENotWhitelistedPool: u64 = 2;

    // === Events ===
    public struct DeepbookV3InternalSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        deep_fee: u64,
        alt_payment_deep_fee: u64,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b_<CoinA, CoinB> (
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>)  {
        let amount = coin::value(&coin_a);

        // alternative payment deep fee
        let (_base_quantity_in, _quote_quantity_out, need_deep_fee) = get_quote_quantity_out(pool, amount, clock);
        let mut alt_payment_deep_fee = 0;

        let deep_fee_coin = if (need_deep_fee > coin::value(&coin_deep)) {
            alt_payment_deep_fee = need_deep_fee - coin::value(&coin_deep);
            assert!(config.is_whitelisted(object::id(pool)), ENotWhitelistedPool);
            config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx)
        } else {
            coin_deep
        };
        let (receive_a, receive_b, receive_deep) = swap_exact_base_for_quote<CoinA, CoinB>(
            pool,
            coin_a,
            deep_fee_coin,
            0, // don't set min quote out
            clock,
            ctx
        );
        let swaped_coin_a_amount = coin::value(&receive_a);
        let swaped_coin_b_amount = coin::value(&receive_b);
        let amount_in = amount - swaped_coin_a_amount;
        let amount_out = swaped_coin_b_amount;

        emit(DeepbookV3InternalSwapEvent {
            pool: object::id(pool),
            a2b: true,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
            deep_fee: need_deep_fee,
            alt_payment_deep_fee,
        });
        (receive_a, receive_b, receive_deep)
    }

    public fun swap_b2a_<CoinA, CoinB> (
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) {
        let amount = coin::value(&coin_b);

        // alternative payment deep fee
        let (_base_quantity_out, _quote_quantity_in, need_deep_fee) = get_base_quantity_out(pool, amount, clock);
        let mut alt_payment_deep_fee = 0;
        let deep_fee_coin = if (need_deep_fee > coin::value(&coin_deep)) {
            alt_payment_deep_fee = need_deep_fee - coin::value(&coin_deep);
            assert!(config.is_whitelisted(object::id(pool)), ENotWhitelistedPool);
            config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx)
        } else {
            coin_deep
        };
        let (receive_a, receive_b, receive_deep) = swap_exact_quote_for_base(
            pool,
            coin_b,
            deep_fee_coin,
            0, // don't set min base out
            clock,
            ctx
        );
        
        let swaped_coin_a_amount = coin::value(&receive_a);
        let swaped_coin_b_amount = coin::value(&receive_b);
        let amount_in = amount - swaped_coin_b_amount;
        let amount_out = swaped_coin_a_amount;

        emit(DeepbookV3InternalSwapEvent {
            pool: object::id(pool),
            a2b: false,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
            deep_fee: need_deep_fee,
            alt_payment_deep_fee,
        });
        (receive_a, receive_b, receive_deep)
    }

    // === Public-Mutative Functions ===
    public fun place_market_order<BaseAsset, QuoteAsset>(
        global_config: &mut GlobalConfig,
        pool: &mut Pool<BaseAsset, QuoteAsset>,
        base_coin: Coin<BaseAsset>,
        quote_coin: Coin<QuoteAsset>,
        deep_coin: Coin<DEEP>,
        self_matching_option: u8,
        quantity: u64,
        is_bid: bool,
        pay_with_deep: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, OrderInfo) {
        global_config.checked_package_version();

        if (is_bid) {
            global_config.deposit(quote_coin, ctx);
            send_or_destory_zero_coin(base_coin, ctx);
        } else {
            global_config.deposit(base_coin, ctx);
            send_or_destory_zero_coin(quote_coin, ctx);
        };

        let user_paid_deep_fee = coin::value(&deep_coin);
        if (coin::value(&deep_coin) > 0) {
            global_config.deposit(deep_coin, ctx);
        } else {
            send_or_destory_zero_coin(deep_coin, ctx);
        };

        if (global_config.is_alternative_payment()) {
            global_config.deposit_proxy_deep(ctx);
        };

        let order_info = global_config.place_market_order_by_trader(
            pool,
            CLIENT_ID_CETUS, 
            self_matching_option,
            quantity,
            is_bid,
            pay_with_deep,
            clock,
            ctx
        );

        let paid_fees = order_info.paid_fees();
        let fee_is_deep = order_info.fee_is_deep();
        let alternative_payment_amount = global_config.alternative_payment_amount() + user_paid_deep_fee;
        let refund_amount = alternative_payment_amount - paid_fees;
        if (fee_is_deep && global_config.is_alternative_payment()) {
            let refund_deep_coin = global_config.withdraw_refund_deep(refund_amount, ctx);
            global_config.deposit_deep_fee(refund_deep_coin);            
        } else {
            let refund_deep_coin = global_config.withdraw_refund_deep(user_paid_deep_fee, ctx);
            global_config.deposit_deep_fee(refund_deep_coin);
        };

        let base_coin = global_config.withdraw_all<BaseAsset>(ctx);
        let quote_coin = global_config.withdraw_all<QuoteAsset>(ctx);

        (base_coin, quote_coin, order_info)
    }

    public fun place_market_order_by_bssm<BaseAsset, QuoteAsset>(
        global_config: &mut GlobalConfig,
        balance_manager: &mut BalanceManager,
        pool: &mut Pool<BaseAsset, QuoteAsset>,
        base_coin: Coin<BaseAsset>,
        quote_coin: Coin<QuoteAsset>,
        deep_coin: Coin<DEEP>,
        self_matching_option: u8,
        quantity: u64,
        is_bid: bool,
        pay_with_deep: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, OrderInfo) {
        global_config.checked_package_version();

        if (is_bid) {
            global_config.deposit(quote_coin, ctx);
            send_or_destory_zero_coin(base_coin, ctx);
        } else {
            global_config.deposit(base_coin, ctx);
            send_or_destory_zero_coin(quote_coin, ctx);
        };

        let user_paid_deep_fee = coin::value(&deep_coin);
        if (coin::value(&deep_coin) > 0) {
            global_config.deposit(deep_coin, ctx);
        } else {
            send_or_destory_zero_coin(deep_coin, ctx);
        };

        if (global_config.is_alternative_payment()) {
            global_config.deposit_proxy_deep(ctx);
        };

        let order_info = place_market_order_by_user_bm(
            balance_manager,
            pool,
            CLIENT_ID_CETUS, 
            self_matching_option,
            quantity,
            is_bid,
            pay_with_deep,
            clock,
            ctx
        );

        let paid_fees = order_info.paid_fees();
        let fee_is_deep = order_info.fee_is_deep();
        let alternative_payment_amount = global_config.alternative_payment_amount() + user_paid_deep_fee;
        let refund_amount = alternative_payment_amount - paid_fees;
        if (fee_is_deep && global_config.is_alternative_payment()) {
            let refund_deep_coin = balance_manager.withdraw<DEEP>(refund_amount, ctx);
            global_config.deposit_deep_fee(refund_deep_coin);            
        } else {
            let refund_deep_coin = balance_manager.withdraw<DEEP>(user_paid_deep_fee, ctx);
            global_config.deposit_deep_fee(refund_deep_coin);
        };

        let base_coin = global_config.withdraw_all<BaseAsset>(ctx);
        let quote_coin = global_config.withdraw_all<QuoteAsset>(ctx);

        (base_coin, quote_coin, order_info)
    }

    #[allow(lint(self_transfer))]
    public fun send_or_destory_zero_coin<CoinType>(
        coin: Coin<CoinType>,
        ctx: &TxContext
    ) {
        if (coin::value(&coin) > 0) {
            transfer::public_transfer(coin, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(coin);
        }
    }
}
