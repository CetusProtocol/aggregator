module cetus_aggregator::aftermath {
    use std::type_name::{Self, TypeName};

    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::tx_context::TxContext;

    use aftermath_amm::pool::Pool;
    use aftermath_amm::pool_registry::PoolRegistry;
    use aftermath_amm::swap::swap_exact_in;
    use protocol_fee_vault::vault::ProtocolFeeVault;
    use treasury::treasury::Treasury;
    use insurance_fund::insurance_fund::InsuranceFund;
    use referral_vault::referral_vault::ReferralVault;

    use cetus_aggregator::utils::transfer_or_destroy_coin;

    const EAmountOutBelowMinLimit: u64 = 0;
    const EInsufficientInputCoin: u64 = 1;

    struct AftermathSwapEvent has copy, store, drop {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB, Fee>(
        pool: &mut Pool<Fee>,
        pool_registry: &PoolRegistry,
        vault: &ProtocolFeeVault,
        treasury: &mut Treasury,
        insurance_fund: &mut InsuranceFund,
        referral_vault: &ReferralVault,
        amount_in: u64,
        amount_limit: u64,
        expect_amount_out: u64,
        slippage: u64,
        coin_a: Coin<CoinA>,
        use_full_input_coin_amount: bool,
        ctx: &mut TxContext,
    ): (Coin<CoinB>, u64, u64) {
        let coin_b = coin::zero<CoinB>(ctx);
        let (coin_a, coin_b, amount_in, amount_out) = swap(
            pool,
            pool_registry,
            vault,
            treasury,
            insurance_fund,
            referral_vault,
            amount_in,
            amount_limit,
            expect_amount_out,
            slippage,
            coin_a,
            coin_b,
            true,
            use_full_input_coin_amount,
            ctx,
        );
        transfer_or_destroy_coin<CoinA>(coin_a, ctx);
        (coin_b, amount_in, amount_out)
    }

    public fun swap_b2a<CoinA, CoinB, Fee>(
        pool: &mut Pool<Fee>,
        pool_registry: &PoolRegistry,
        vault: &ProtocolFeeVault,
        treasury: &mut Treasury,
        insurance_fund: &mut InsuranceFund,
        referral_vault: &ReferralVault,
        amount_in: u64,
        amount_limit: u64,
        expect_amount_out: u64,
        slippage: u64,
        coin_b: Coin<CoinB>,
        use_full_input_coin_amount: bool,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, u64, u64) {
        let coin_a = coin::zero<CoinA>(ctx);
        let (coin_a, coin_b, amount_in, amount_out) = swap(
            pool,
            pool_registry,
            vault,
            treasury,
            insurance_fund,
            referral_vault,
            amount_in,
            amount_limit,
            expect_amount_out,
            slippage,
            coin_a,
            coin_b,
            false,
            use_full_input_coin_amount,
            ctx,
        );
        transfer_or_destroy_coin<CoinB>(coin_b, ctx);
        (coin_a, amount_in, amount_out)
    }

    #[allow(unused_assignment)]
    public fun swap<CoinA, CoinB, Fee>(
        pool: &mut Pool<Fee>,
        pool_registry: &PoolRegistry,
        vault: &ProtocolFeeVault,
        treasury: &mut Treasury,
        insurance_fund: &mut InsuranceFund,
        referral_vault: &ReferralVault,
        amount_in: u64,
        amount_limit: u64,
        expect_amount_out: u64,
        slippage: u64,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        a2b: bool,
        use_full_input_coin_amount: bool,
        ctx: &mut TxContext,
    ): (Coin<CoinA>, Coin<CoinB>, u64, u64) {
        let pure_coin_a_amount = coin::value(&coin_a);
        let pure_coin_b_amount = coin::value(&coin_b);

        if (use_full_input_coin_amount) {
            amount_in = if (a2b) pure_coin_a_amount else pure_coin_b_amount;
        };

        let amount_out = 0;

        if (a2b) {
            assert!(coin::value(&coin_a) >= amount_in, EInsufficientInputCoin);
            let swap_coin_a = coin::split(&mut coin_a, amount_in, ctx);
            let received_b = swap_exact_in<Fee, CoinA, CoinB>(
                pool,
                pool_registry,
                vault,
                treasury,
                insurance_fund,
                referral_vault,
                swap_coin_a,
                expect_amount_out,
                slippage,
                ctx,
            );

            assert!(coin::value(&received_b) >= amount_limit, EAmountOutBelowMinLimit);

            amount_out = coin::value(&received_b);

            emit(AftermathSwapEvent {
                pool: object::id(pool),
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });

            coin::join(&mut coin_b, received_b);
        } else {
            assert!(coin::value(&coin_b) >= amount_in, EInsufficientInputCoin);
            let swap_coin_b = coin::split(&mut coin_b, amount_in, ctx);
            let received_a = swap_exact_in<Fee, CoinB, CoinA>(
                pool,
                pool_registry,
                vault,
                treasury,
                insurance_fund,
                referral_vault,
                swap_coin_b,
                expect_amount_out,
                slippage,
                ctx
            );

            assert!(coin::value(&received_a) >= amount_limit, EAmountOutBelowMinLimit);

            amount_out = coin::value(&received_a);

            emit(AftermathSwapEvent {
                pool: object::id(pool),
                amount_in,
                amount_out,
                a2b,
                by_amount_in: true,
                coin_a: type_name::get<CoinA>(),
                coin_b: type_name::get<CoinB>(),
            });

            coin::join(&mut coin_a, received_a);
        };
        (coin_a, coin_b, amount_in, amount_out)
    }
}
