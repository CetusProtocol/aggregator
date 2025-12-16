module cetus_aggregator_simple::magma {
    use magma::config::GlobalConfig;
    use magma::pool::{Pool, FlashSwapReceipt, flash_swap, repay_flash_swap};
    use magma::tick_math::{min_sqrt_price, max_sqrt_price};
    use std::type_name::{Self, TypeName};
    use sui::balance;
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event::emit;

    public struct MagmaSwapEvent has copy, drop, store {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    // Direct swap A to B using flash swap pattern
    public fun swap_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let amount_in = coin::value(&coin_a);
        let pool_id = object::id(pool);

        // Use flash swap to perform the swap
        let (mut balance_a, balance_b, receipt) = flash_swap<CoinA, CoinB>(
            config,
            pool,
            true, // a2b
            true, // by_amount_in
            amount_in,
            min_sqrt_price(), // Use minimum price limit for exact input
            clock,
        );

        // Add our input coin to the received balance
        let input_balance = coin::into_balance(coin_a);
        balance::join(&mut balance_a, input_balance);

        // Repay the flash swap
        repay_flash_swap<CoinA, CoinB>(
            config,
            pool,
            balance_a,
            balance::zero<CoinB>(),
            receipt,
        );

        // Convert balance to coin and emit event
        let coin_out = coin::from_balance(balance_b, ctx);
        let amount_out = coin::value(&coin_out);

        emit(MagmaSwapEvent {
            pool: pool_id,
            amount_in,
            amount_out,
            a2b: true,
            by_amount_in: true,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });

        coin_out
    }

    // Direct swap B to A using flash swap pattern
    public fun swap_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let amount_in = coin::value(&coin_b);
        let pool_id = object::id(pool);

        // Use flash swap to perform the swap
        let (balance_a, mut balance_b, receipt) = flash_swap<CoinA, CoinB>(
            config,
            pool,
            false, // b2a
            true, // by_amount_in
            amount_in,
            max_sqrt_price(), // Use maximum price limit for exact input
            clock,
        );

        // Add our input coin to the received balance
        let input_balance = coin::into_balance(coin_b);
        balance::join(&mut balance_b, input_balance);

        // Repay the flash swap
        repay_flash_swap<CoinA, CoinB>(
            config,
            pool,
            balance::zero<CoinA>(),
            balance_b,
            receipt,
        );

        // Convert balance to coin and emit event
        let coin_out = coin::from_balance(balance_a, ctx);
        let amount_out = coin::value(&coin_out);

        emit(MagmaSwapEvent {
            pool: pool_id,
            amount_in,
            amount_out,
            a2b: false,
            by_amount_in: true,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });

        coin_out
    }
}
