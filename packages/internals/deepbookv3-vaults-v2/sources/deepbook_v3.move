#[allow(unused_const)]
module deepbookv3_vaults_v2::deepbook_v3 {
    use deepbookv3::balance_manager::{BalanceManager, DeepBookPoolReferral};
    use deepbookv3::math;
    use deepbookv3::order_info::OrderInfo;
    use deepbookv3::pool::{
        swap_exact_base_for_quote,
        swap_exact_quote_for_base,
        swap_exact_base_for_quote_with_manager,
        swap_exact_quote_for_base_with_manager,
        get_base_quantity_out,
        get_quote_quantity_out,
        pool_referral_multiplier,
        Pool
    };
    use deepbookv3_vaults_v2::global_config::{GlobalConfig, BalanceCaps};
    use std::type_name::{Self, TypeName};
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use token::deep::DEEP;

    // === Constants ===
    const CLIENT_ID_CETUS: u64 = 1107;

    /// Float scaling constant (10^9) used for decimal calculations
    const FLOAT_SCALING: u64 = 1_000_000_000;

    /// Default referral fee multiplier (10% = 100_000_000 / 1_000_000_000)
    /// This should match the actual referral multiplier configured on the BalanceManager
    const DEFAULT_REFERRAL_MULTIPLIER: u64 = 100_000_000;

    // === Errors ===
    const ENotWhitelistedPool: u64 = 2;

    // === Events ===
    public struct DeepbookV3InternalSwapEvent has copy, drop, store {
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

    public fun swap_a2b_<CoinA, CoinB>(
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) {
        config.checked_package_version();
        let amount = coin::value(&coin_a);

        // alternative payment deep fee
        let (_base_quantity_in, _quote_quantity_out, need_deep_fee) = get_quote_quantity_out(
            pool,
            amount,
            clock,
        );
        let mut alt_payment_deep_fee = 0;

        let input_deep_amount = coin::value(&coin_deep);
        let deep_fee_coin = if (need_deep_fee > input_deep_amount) {
            alt_payment_deep_fee = need_deep_fee - input_deep_amount;
            let alt_deep = config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx);
            alt_deep
        } else {
            coin_deep
        };

        let input_deep_fee = coin::value(&deep_fee_coin);
        let (receive_a, receive_b, receive_deep) = swap_exact_base_for_quote<CoinA, CoinB>(
            pool,
            coin_a,
            deep_fee_coin,
            0, // don't set min quote out
            clock,
            ctx,
        );
        let output_deep_fee = coin::value(&receive_deep);
        let deep_fee = input_deep_fee - output_deep_fee;
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
            coin_a: type_name::with_original_ids<CoinA>(),
            coin_b: type_name::with_original_ids<CoinB>(),
            deep_fee,
            alt_payment_deep_fee,
        });
        (receive_a, receive_b, receive_deep)
    }

    public fun swap_b2a_<CoinA, CoinB>(
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) {
        config.checked_package_version();
        let amount = coin::value(&coin_b);

        // alternative payment deep fee
        let (_base_quantity_out, _quote_quantity_in, need_deep_fee) = get_base_quantity_out(
            pool,
            amount,
            clock,
        );
        let mut alt_payment_deep_fee = 0;
        let input_deep_amount = coin::value(&coin_deep);
        let deep_fee_coin = if (need_deep_fee > input_deep_amount) {
            alt_payment_deep_fee = need_deep_fee - input_deep_amount;
            let alt_deep = config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx);
            alt_deep
        } else {
            coin_deep
        };

        let input_deep_fee = coin::value(&deep_fee_coin);
        let (receive_a, receive_b, receive_deep) = swap_exact_quote_for_base(
            pool,
            coin_b,
            deep_fee_coin,
            0, // don't set min base out
            clock,
            ctx,
        );
        let output_deep_fee = coin::value(&receive_deep);
        let deep_fee = input_deep_fee - output_deep_fee;

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
            coin_a: type_name::with_original_ids<CoinA>(),
            coin_b: type_name::with_original_ids<CoinB>(),
            deep_fee,
            alt_payment_deep_fee,
        });
        (receive_a, receive_b, receive_deep)
    }

    // === Public-Mutative Functions ===
    public fun place_market_order<BaseAsset, QuoteAsset>(
        _global_config: &mut GlobalConfig,
        _pool: &mut Pool<BaseAsset, QuoteAsset>,
        _base_coin: Coin<BaseAsset>,
        _quote_coin: Coin<QuoteAsset>,
        _deep_coin: Coin<DEEP>,
        _self_matching_option: u8,
        _quantity: u64,
        _is_bid: bool,
        _pay_with_deep: bool,
        _clock: &Clock,
        _ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, OrderInfo) {
        abort 0
    }

    public fun place_market_order_by_bssm<BaseAsset, QuoteAsset>(
        _global_config: &mut GlobalConfig,
        _balance_manager: &mut BalanceManager,
        _pool: &mut Pool<BaseAsset, QuoteAsset>,
        _base_coin: Coin<BaseAsset>,
        _quote_coin: Coin<QuoteAsset>,
        _deep_coin: Coin<DEEP>,
        _self_matching_option: u8,
        _quantity: u64,
        _is_bid: bool,
        _pay_with_deep: bool,
        _clock: &Clock,
        _ctx: &mut TxContext,
    ): (Coin<BaseAsset>, Coin<QuoteAsset>, OrderInfo) {
        abort 0
    }

    // === Referral Swap Functions (with user's BalanceManager + Alternative Payment) ===
    // Note: Referral must be set on user's BalanceManager beforehand via global_config::set_referral()
    // These functions use the user-provided BalanceManager for swap with referral support,
    // combined with alternative payment mechanism for DEEP fee sponsorship.

    /// Swap A to B with referral support using user's BalanceManager.
    /// Referral must be configured on the BalanceManager beforehand.
    /// Supports alternative payment: if user's DEEP is insufficient, vault sponsors the difference (within limits).
    /// Returns (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) - remaining coins after swap.
    public fun swap_a2b_with_referral<CoinA, CoinB>(
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        balance_caps: &BalanceCaps,
        referral: &DeepBookPoolReferral,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) {
        config.checked_package_version();
        let amount = coin::value(&coin_a);

        // Calculate required DEEP fee (base fee from pool)
        let (_base_quantity_in, _quote_quantity_out, base_deep_fee) = get_quote_quantity_out(
            pool,
            amount,
            clock,
        );
        // Add referral fee on top of base fee
        // referral_fee = base_deep_fee * referral_multiplier / FLOAT_SCALING
        let referral_multiplier = pool_referral_multiplier(pool, referral);
        let referral_fee = math::mul(base_deep_fee, referral_multiplier);
        let need_deep_fee = base_deep_fee + referral_fee;

        let mut alt_payment_deep_fee = 0;

        // Check if alternative payment is needed
        let input_deep_amount = coin::value(&coin_deep);
        let (deep_fee_coin, withdraw_deep_amount) = if (need_deep_fee > input_deep_amount) {
            alt_payment_deep_fee = need_deep_fee - input_deep_amount;
            let alt_deep = config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx);
            (alt_deep, 0)
        } else {
            (coin_deep, input_deep_amount - need_deep_fee)
        };

        let input_deep_fee = coin::value(&deep_fee_coin);

        let (balance_manager, trade_cap) = config.get_mut_balance_manager_and_trade_cap();
        balance_manager.deposit(deep_fee_coin, ctx);
        let (deposit_cap, withdraw_cap) = balance_caps.get_deposit_and_withdraw_caps();

        // Execute swap with manager (supports referral) - pass coin directly
        let (receive_a, receive_b) = swap_exact_base_for_quote_with_manager<CoinA, CoinB>(
            pool,
            balance_manager,
            trade_cap,
            deposit_cap,
            withdraw_cap,
            coin_a,
            0, // don't set min quote out
            clock,
            ctx,
        );

        // Withdraw remaining DEEP from balance_manager
        let receive_deep = balance_manager.withdraw<DEEP>(withdraw_deep_amount, ctx);

        let output_deep_fee = coin::value(&receive_deep);
        let deep_fee = input_deep_fee - output_deep_fee;
        let amount_in = amount - receive_a.value();
        let amount_out = receive_b.value();

        emit(DeepbookV3InternalSwapEvent {
            pool: object::id(pool),
            a2b: true,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::with_original_ids<CoinA>(),
            coin_b: type_name::with_original_ids<CoinB>(),
            deep_fee,
            alt_payment_deep_fee,
        });

        (receive_a, receive_b, receive_deep)
    }

    /// Swap B to A with referral support using user's BalanceManager.
    /// Referral must be configured on the BalanceManager beforehand.
    /// Supports alternative payment: if user's DEEP is insufficient, vault sponsors the difference (within limits).
    /// Returns (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) - remaining coins after swap.
    public fun swap_b2a_with_referral<CoinA, CoinB>(
        config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        balance_caps: &BalanceCaps,
        referral: &DeepBookPoolReferral,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, Coin<DEEP>) {
        config.checked_package_version();
        let amount = coin::value(&coin_b);

        // Calculate required DEEP fee (base fee from pool)
        let (_base_quantity_out, _quote_quantity_in, base_deep_fee) = get_base_quantity_out(
            pool,
            amount,
            clock,
        );
        // Add referral fee on top of base fee

        let referral_multiplier = pool_referral_multiplier(pool, referral);
        let referral_fee = math::mul(base_deep_fee, referral_multiplier);

        let need_deep_fee = base_deep_fee + referral_fee;

        let mut alt_payment_deep_fee = 0;

        // Check if alternative payment is needed
        let input_deep_amount = coin::value(&coin_deep);
        let (deep_fee_coin, withdraw_deep_amount) = if (need_deep_fee > input_deep_amount) {
            alt_payment_deep_fee = need_deep_fee - input_deep_amount;
            let alt_deep = config.alternative_payment_deep(coin_deep, alt_payment_deep_fee, ctx);
            (alt_deep, 0)
        } else {
            (coin_deep, input_deep_amount - need_deep_fee)
        };

        let input_deep_fee = coin::value(&deep_fee_coin);
        let (balance_manager, trade_cap) = config.get_mut_balance_manager_and_trade_cap();
        balance_manager.deposit(deep_fee_coin, ctx);

        let (deposit_cap, withdraw_cap) = balance_caps.get_deposit_and_withdraw_caps();

        // Execute swap with manager (supports referral) - pass coin directly
        let (receive_a, receive_b) = swap_exact_quote_for_base_with_manager<CoinA, CoinB>(
            pool,
            balance_manager,
            trade_cap,
            deposit_cap,
            withdraw_cap,
            coin_b,
            0, // don't set min base out
            clock,
            ctx,
        );

        // Withdraw remaining DEEP from BalanceManager
        let receive_deep = balance_manager.withdraw<DEEP>(withdraw_deep_amount, ctx);

        let output_deep_fee = coin::value(&receive_deep);
        let deep_fee = input_deep_fee - output_deep_fee;
        let amount_in = amount - receive_b.value();
        let amount_out = receive_a.value();

        emit(DeepbookV3InternalSwapEvent {
            pool: object::id(pool),
            a2b: false,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::with_original_ids<CoinA>(),
            coin_b: type_name::with_original_ids<CoinB>(),
            deep_fee,
            alt_payment_deep_fee,
        });

        (receive_a, receive_b, receive_deep)
    }

    #[allow(lint(self_transfer))]
    public fun send_or_destory_zero_coin<CoinType>(coin: Coin<CoinType>, ctx: &TxContext) {
        if (coin::value(&coin) > 0) {
            transfer::public_transfer(coin, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(coin);
        }
    }
}
