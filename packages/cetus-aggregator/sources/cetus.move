module cetus_aggregator::cetus {
    use std::type_name::{Self, TypeName};

    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::balance::Self;
    use sui::event::emit;
    use sui::tx_context::TxContext;

    use cetus_clmm::config::GlobalConfig;
    use cetus_clmm::pool::{Self, Pool, FlashSwapReceipt};
    use cetus_clmm::partner::Partner;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    const EAmountOutBelowMinLimit: u64 = 2;
    const EAmountInAboveMaxLimit: u64 = 3;
    const EInsufficientRepayCoin: u64 = 6;

    struct CetusSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        partner_id: address,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun flash_swap_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
      let (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount) = flash_swap(config, pool, amount, amount_limit, true, by_amount_in, sqrt_price_limit, clock, ctx);
      transfer_or_destroy_coin<CoinA>(coin_a, ctx);
      (coin_b, flash_receipt, repay_amount, swaped_amount)
    }

    public fun flash_swap_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<CoinA>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
      let (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount) = flash_swap(config, pool, amount, amount_limit, false, by_amount_in, sqrt_price_limit, clock, ctx);
      transfer_or_destroy_coin<CoinB>(coin_b, ctx);
      (coin_a, flash_receipt, repay_amount, swaped_amount) 
    }

    public fun flash_swap<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        a2b: bool,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
        let (receive_a, receive_b, flash_receipt) = pool::flash_swap<CoinA, CoinB>(
            config,
            pool,
            a2b,
            by_amount_in,
            amount,
            sqrt_price_limit,
            clock
        );

        let receive_a_amount = balance::value(&receive_a);
        let receive_b_amount = balance::value(&receive_b);

        let repay_amount = pool::swap_pay_amount(&flash_receipt);
       
        if (by_amount_in) {
            assert!(receive_b_amount + receive_a_amount >= amount_limit, EAmountOutBelowMinLimit);
        } else {
            assert!(repay_amount < amount_limit, EAmountInAboveMaxLimit);
        };

        
        let amount_in = if (by_amount_in) { amount } else { repay_amount };
        let amount_out = receive_a_amount + receive_b_amount;

        emit(CetusSwapEvent {
            pool: object::id(pool),
            amount_in,
            amount_out,
            a2b,
            by_amount_in,
            partner_id: @0x0,
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });

        let coin_a = coin::from_balance(receive_a, ctx);
        let coin_b = coin::from_balance(receive_b, ctx);

        let swaped_amount = if (a2b) {
          receive_b_amount
        } else {
          receive_a_amount
        };

        (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount)
    }

    public fun flash_swap_with_partner_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        partner: &mut Partner,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
      let (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount) = flash_swap_with_partner<CoinA, CoinB>(config, pool, amount, amount_limit, true, by_amount_in, sqrt_price_limit, partner, clock, ctx);
      transfer_or_destroy_coin<CoinA>(coin_a, ctx);
      (coin_b, flash_receipt, repay_amount, swaped_amount)
    }

    public fun flash_swap_with_partner_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        partner: &mut Partner,
        clock: &Clock,
        ctx: &mut TxContext
    ): (Coin<CoinA>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
      let (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount) = flash_swap_with_partner<CoinA, CoinB>(config, pool, amount, amount_limit, false, by_amount_in, sqrt_price_limit, partner, clock, ctx);
      transfer_or_destroy_coin<CoinB>(coin_b, ctx);
      (coin_a, flash_receipt, repay_amount, swaped_amount) 
    }

    public fun flash_swap_with_partner<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        amount: u64,
        amount_limit: u64,
        a2b: bool,
        by_amount_in: bool,
        sqrt_price_limit: u128,
        partner: &mut Partner,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, FlashSwapReceipt<CoinA, CoinB>, u64, u64) {
        let (receive_a, receive_b, flash_receipt) = pool::flash_swap_with_partner<CoinA, CoinB>(
            config,
            pool,
            partner,

            a2b,
            by_amount_in,
            amount,
            sqrt_price_limit,
            clock
        );

        let receive_a_amount = balance::value(&receive_a);
        let receive_b_amount = balance::value(&receive_b);

        let repay_amount = pool::swap_pay_amount(&flash_receipt);
       
        if (by_amount_in) {
            assert!(receive_b_amount + receive_a_amount >= amount_limit, EAmountOutBelowMinLimit);
        } else {
            assert!(repay_amount < amount_limit, EAmountInAboveMaxLimit);
        };

        
        let amount_in = if (by_amount_in) { amount } else { repay_amount };
        let amount_out = receive_a_amount + receive_b_amount;

        emit(CetusSwapEvent {
            pool: object::id(pool),
            amount_in,
            amount_out,
            a2b,
            by_amount_in,
            partner_id: object::id_to_address(&object::id(partner)),
            coin_a: type_name::get<CoinA>(),
            coin_b: type_name::get<CoinB>(),
        });

        let swaped_amount = if (a2b) {
          receive_b_amount
        } else {
          receive_a_amount
        };

        let coin_a = coin::from_balance(receive_a, ctx);
        let coin_b = coin::from_balance(receive_b, ctx);
        (coin_a, coin_b, flash_receipt, repay_amount, swaped_amount)
    }

    public fun repay_flash_swap_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let coin_b = coin::zero<CoinB>(ctx);
        let (repaid_coin_a, repaid_coin_b) = repay_flash_swap(config, pool, true, coin_a, coin_b, receipt, ctx);
        transfer_or_destroy_coin<CoinB>(repaid_coin_b, ctx);
        (repaid_coin_a)
    }

    public fun repay_flash_swap_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let coin_a = coin::zero<CoinA>(ctx);
        let (repaid_coin_a, repaid_coin_b) = repay_flash_swap(config, pool, false, coin_a, coin_b, receipt, ctx);
        transfer_or_destroy_coin<CoinA>(repaid_coin_a, ctx);
        (repaid_coin_b)
    }

    public fun repay_flash_swap<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        a2b: bool,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        let repay_amount = pool::swap_pay_amount(&receipt);

        let (pay_coin_a, pay_coin_b) = if (a2b) {
            assert!(coin::value(&coin_a) >= repay_amount, EInsufficientRepayCoin);
            (coin::into_balance(coin::split(&mut coin_a, repay_amount, ctx)), balance::zero<CoinB>())
        } else {
            assert!(coin::value(&coin_b) >= repay_amount, EInsufficientRepayCoin);
            (balance::zero<CoinA>(), coin::into_balance(coin::split(&mut coin_b, repay_amount, ctx)))
        };

        pool::repay_flash_swap<CoinA, CoinB>(
            config,
            pool,
            pay_coin_a,
            pay_coin_b,
            receipt
        );

        (coin_a, coin_b)
    }

    public fun repay_flash_swap_with_partner_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        partner: &mut Partner,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        let coin_b = coin::zero<CoinB>(ctx);
        let (repaid_coin_a, repaid_coin_b) = repay_flash_swap_with_partner(config, pool, true, coin_a, coin_b, receipt, partner, ctx);
        transfer_or_destroy_coin<CoinB>(repaid_coin_b, ctx);
        (repaid_coin_a)
    }

    public fun repay_flash_swap_with_partner_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        partner: &mut Partner,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        let coin_a = coin::zero<CoinA>(ctx);
        let (repaid_coin_a, repaid_coin_b) = repay_flash_swap_with_partner(config, pool, false, coin_a, coin_b, receipt, partner, ctx);
        transfer_or_destroy_coin<CoinA>(repaid_coin_a, ctx);
        (repaid_coin_b)
    }

    public fun repay_flash_swap_with_partner<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        a2b: bool,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        receipt: FlashSwapReceipt<CoinA, CoinB>,
        partner: &mut Partner,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>) {
        let repay_amount = pool::swap_pay_amount(&receipt);

        let (pay_coin_a, pay_coin_b) = if (a2b) {
            assert!(coin::value(&coin_a) >= repay_amount, EInsufficientRepayCoin);
            (coin::into_balance(coin::split(&mut coin_a, repay_amount, ctx)), balance::zero<CoinB>())
        } else {
            assert!(coin::value(&coin_b) >= repay_amount, EInsufficientRepayCoin);
            (balance::zero<CoinA>(), coin::into_balance(coin::split(&mut coin_b, repay_amount, ctx)))
        };

        pool::repay_flash_swap_with_partner<CoinA, CoinB>(
            config,
            pool,
            partner,
            pay_coin_a,
            pay_coin_b,
            receipt
        );

        (coin_a, coin_b)
    }
}
