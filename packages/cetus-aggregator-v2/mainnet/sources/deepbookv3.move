module cetus_aggregator::deepbookv3 {
    use std::type_name::{Self, TypeName};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event::emit;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};

    use deepbookv3::pool::{swap_exact_base_for_quote, swap_exact_quote_for_base, get_base_quantity_out, get_quote_quantity_out, Pool};
    use token::deep::DEEP;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    // === Errors ===
    const EInsufficientDeepFee: u64 = 0;
    const ENotAlternativePayment: u64 = 1;
    const ENotWhitelisted: u64 = 2;

    // === Structs ===
    public struct AdminCap has key, store {
        id: UID,
    }

    public struct DeepbookV3Config has key, store {
        id: UID,
        is_alternative_payment: bool,
        deep_fee_vault: Balance<DEEP>,
        whitelist: Table<ID, bool>,
    }

    public struct InitDeepbookV3Event has copy, drop {
        admin_cap_id: ID,
        deepbook_v3_config_id: ID,
    }

   public struct DeepbookV3SwapEvent has copy, store, drop {
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

    // === Functions ===
    fun init(ctx: &mut TxContext) {
        let (deepbook_v3_config, admin_cap) = (
            DeepbookV3Config {
                id: object::new(ctx),
                is_alternative_payment: true,
                deep_fee_vault: balance::zero<DEEP>(),
                whitelist: table::new<ID, bool>(ctx),
            },
            AdminCap {
                id: object::new(ctx),
            }
        );

        let (deepbook_v3_config_id, admin_cap_id) = (object::id(&deepbook_v3_config), object::id(&admin_cap));

        let sender = tx_context::sender(ctx);
        transfer::transfer(admin_cap, sender);
        transfer::share_object(deepbook_v3_config);

        emit(InitDeepbookV3Event {
            admin_cap_id,
            deepbook_v3_config_id,
        });
    }

    public fun is_alternative_payment(config: &DeepbookV3Config): bool {
        config.is_alternative_payment
    }

    public fun set_alternative_payment(_: &AdminCap, config: &mut DeepbookV3Config, is_alternative_payment: bool) {
        config.is_alternative_payment = is_alternative_payment;
    }

    public(package) fun alternative_payment_deep(config: &mut DeepbookV3Config, deep_coin: Coin<DEEP>, alt_amount: u64, ctx: &mut TxContext): Coin<DEEP> {
        assert!(is_alternative_payment(config), ENotAlternativePayment);
        let deep_fee_balance_value = balance::value(&config.deep_fee_vault);
        assert!(deep_fee_balance_value >= alt_amount, EInsufficientDeepFee);
        let balance = balance::split(&mut config.deep_fee_vault, alt_amount);
        let mut pure_deep_balance = coin::into_balance(deep_coin);
        balance::join(&mut pure_deep_balance, balance);
        coin::from_balance(pure_deep_balance, ctx)
    }

    public fun add_whitelist(_: &AdminCap, config: &mut DeepbookV3Config, pool_id: ID, is_whitelisted: bool) {
        table::add(&mut config.whitelist, pool_id, is_whitelisted);
    }

    public fun remove_whitelist(_: &AdminCap, config: &mut DeepbookV3Config, pool_id: ID) {
        if (!is_whitelisted(config, pool_id)) return;
        table::remove(&mut config.whitelist, pool_id);
    }

    public(package) fun is_whitelisted(config: &DeepbookV3Config, pool_id: ID): bool {
        table::contains(&config.whitelist, pool_id)
    }

    // === Deposit Deep Fee ===
    public fun deposit_deep_fee(deepbookv3_config: &mut DeepbookV3Config, deep_coin: Coin<DEEP>) {
        let balance = coin::into_balance(deep_coin);
        let _ = balance::join(&mut deepbookv3_config.deep_fee_vault, balance);
    }

    public fun withdraw_deep_fee(deepbookv3_config: &mut DeepbookV3Config, amount: u64, ctx: &mut TxContext): Coin<DEEP> {
        let balance = balance::split(&mut deepbookv3_config.deep_fee_vault, amount);
        coin::from_balance(balance, ctx)
    }

    public fun swap_a2b<CoinA, CoinB> (
        config: &mut DeepbookV3Config,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount = coin::value(&coin_a);
        // alternative payment deep fee
        let (_base_quantity_in, _quote_quantity_out, need_deep_fee) = get_quote_quantity_out(pool, amount, clock);
        let mut alt_payment_deep_fee = 0;

        let deep_fee_coin = if (need_deep_fee > coin::value(&coin_deep)) {
            alt_payment_deep_fee = need_deep_fee - coin::value(&coin_deep);
            assert!(is_whitelisted(config, object::id(pool)), ENotWhitelisted);
            alternative_payment_deep(config, coin_deep, alt_payment_deep_fee, ctx)
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
        emit(DeepbookV3SwapEvent {
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
        transfer_or_destroy_coin<CoinA>(receive_a, ctx);
        transfer_or_destroy_coin<DEEP>(receive_deep, ctx);
        receive_b
    }

    public fun swap_b2a<CoinA, CoinB> (
        config: &mut DeepbookV3Config,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount = coin::value(&coin_b);
        // alternative payment deep fee
        let (_base_quantity_out, _quote_quantity_in, need_deep_fee) = get_base_quantity_out(pool, amount, clock);
        let mut alt_payment_deep_fee = 0;
        let deep_fee_coin = if (need_deep_fee > coin::value(&coin_deep)) {
            alt_payment_deep_fee = need_deep_fee - coin::value(&coin_deep);
            assert!(is_whitelisted(config, object::id(pool)), ENotWhitelisted);
            alternative_payment_deep(config, coin_deep, alt_payment_deep_fee, ctx)
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
        emit(DeepbookV3SwapEvent {
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
        transfer_or_destroy_coin<CoinB>(receive_b, ctx);
        transfer_or_destroy_coin<DEEP>(receive_deep, ctx);
        receive_a
    }
}
