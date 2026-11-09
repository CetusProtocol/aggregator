#[allow(unused_use, unused_field, unused_variable)]
module test::swap {
    use bluefin_spot::config::GlobalConfig as BluefinGlobalConfig;
    use bluefin_spot::pool::Pool as BluefinPool;
    use cetus_clmm::config::GlobalConfig;
    use cetus_clmm::partner::Partner;
    use cetus_clmm::pool::{Self, Pool, FlashSwapReceipt};
    use cetus_clmm::tick_math;
    use flowx_clmm::pool_manager::{PoolRegistry, borrow_mut_pool};
    use flowx_clmm::versioned::Versioned;
    use haedal_pmm::oracle_driven_pool::Pool as HMM_POOL;
    use haedal_pmm::trader::{sell_base_coin, sell_quote_coin};
    use mmt_v3::pool::Pool as MMT_Pool;
    use mmt_v3::version::Version as MMT_Version;
    use obric::v2::{TradingPair, swap_x_to_y, swap_y_to_x};
    use pyth::price_info::PriceInfoObject;
    use pyth::state::State as PythState;
    use std::type_name::{Self, TypeName};
    use sui::balance;
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use turbos_dex::pool::{Pool as TurbosPool, Versioned as TurbosVersioned};
    use turbos_dex::swap_router::{swap_a_b_with_return_, swap_b_a_with_return_};

    public fun test_cetus_swap_a2b<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        partner: &mut Partner,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::cetus::swap_a2b(config, pool, partner, coin_a, clock, ctx)
    }

    public fun test_cetus_swap_b2a<CoinA, CoinB>(
        config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        partner: &mut Partner,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::cetus::swap_b2a(config, pool, partner, coin_b, clock, ctx)
    }

    public fun test_bluefin_swap_a2b<CoinA, CoinB>(
        config: &mut BluefinGlobalConfig,
        pool: &mut BluefinPool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::bluefin::swap_a2b(config, pool, coin_a, clock, ctx)
    }

    public fun test_bluefin_swap_b2a<CoinA, CoinB>(
        config: &mut BluefinGlobalConfig,
        pool: &mut BluefinPool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::bluefin::swap_b2a(config, pool, coin_b, clock, ctx)
    }

    public fun test_flowx_clmm_swap_a2b<CoinA, CoinB>(
        pool_register: &mut PoolRegistry,
        fee: u64,
        coin_a: Coin<CoinA>,
        versioned: &Versioned,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::flowx_clmm::swap_a2b(
            pool_register,
            fee,
            coin_a,
            versioned,
            clock,
            ctx,
        )
    }

    public fun test_flowx_clmm_swap_b2a<CoinA, CoinB>(
        pool_register: &mut PoolRegistry,
        fee: u64,
        coin_a: Coin<CoinB>,
        versioned: &Versioned,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::flowx_clmm::swap_b2a(
            pool_register,
            fee,
            coin_a,
            versioned,
            clock,
            ctx,
        )
    }

    public fun test_turbos_swap_a2b<CoinA, CoinB, Fee>(
        pool: &mut TurbosPool<CoinA, CoinB, Fee>,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        versioned: &TurbosVersioned,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::turbos::swap_a2b(pool, coin_a, clock, versioned, ctx)
    }

    public fun test_turbos_swap_b2a<CoinA, CoinB, Fee>(
        pool: &mut TurbosPool<CoinA, CoinB, Fee>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        versioned: &TurbosVersioned,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::turbos::swap_b2a(pool, coin_b, clock, versioned, ctx)
    }

    public fun test_haedal_pmm_swap_a2b<CoinA, CoinB>(
        pool: &mut HMM_POOL<CoinA, CoinB>,
        base_price_pair_obj: &PriceInfoObject,
        quote_price_pair_obj: &PriceInfoObject,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::haedalpmm::swap_a2b(
            pool,
            base_price_pair_obj,
            quote_price_pair_obj,
            coin_a,
            clock,
            ctx,
        )
    }

    public fun test_haedal_pmm_swap_b2a<CoinA, CoinB>(
        pool: &mut HMM_POOL<CoinA, CoinB>,
        base_price_pair_obj: &PriceInfoObject,
        quote_price_pair_obj: &PriceInfoObject,
        coin_a: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::haedalpmm::swap_b2a(
            pool,
            base_price_pair_obj,
            quote_price_pair_obj,
            coin_a,
            clock,
            ctx,
        )
    }

    public fun test_mmt_swap_a2b<CoinA, CoinB>(
        pool: &mut MMT_Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        versioned: &MMT_Version,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::momentum::swap_a2b(pool, coin_a, versioned, clock, ctx)
    }

    public fun test_mmt_swap_b2a<CoinA, CoinB>(
        pool: &mut MMT_Pool<CoinA, CoinB>,
        coin_a: Coin<CoinB>,
        versioned: &MMT_Version,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::momentum::swap_b2a(pool, coin_a, versioned, clock, ctx)
    }

    public fun test_obric_swap_a2b<CoinA, CoinB>(
        pool: &mut TradingPair<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        pyth_state: &PythState,
        a_price_info_object: &PriceInfoObject,
        b_price_info_object: &PriceInfoObject,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        cetus_aggregator_simple::obric::swap_a2b(
            pool,
            coin_a,
            pyth_state,
            a_price_info_object,
            b_price_info_object,
            clock,
            ctx,
        )
    }

    public fun test_obric_swap_b2a<CoinA, CoinB>(
        pool: &mut TradingPair<CoinA, CoinB>,
        coin_a: Coin<CoinB>,
        pyth_state: &PythState,
        a_price_info_object: &PriceInfoObject,
        b_price_info_object: &PriceInfoObject,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        cetus_aggregator_simple::obric::swap_b2a(
            pool,
            coin_a,
            pyth_state,
            a_price_info_object,
            b_price_info_object,
            clock,
            ctx,
        )
    }
}
