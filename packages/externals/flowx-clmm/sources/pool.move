module flowx_clmm::pool {
    use flowx_clmm::{i32::I32, oracle::Observation, tick::TickInfo, versioned::Versioned};
    use std::type_name::TypeName;
    use sui::{balance::Balance, object::{ID, UID}, table::Table, clock::Clock, tx_context::TxContext};


    #[allow(unused_field)]
    struct Pool<phantom CoinTypeA, phantom CoinTypeB> has key {
        id: UID,
        coin_type_x: TypeName,
        coin_type_y: TypeName,
        sqrt_price: u128,
        tick_index: I32,
        observation_index: u64,
        observation_cardinality: u64,
        observation_cardinality_next: u64,
        tick_spacing: u32,
        max_liquidity_per_tick: u128,
        protocol_fee_rate: u64,
        swap_fee_rate: u64,
        fee_growth_global_x: u128,
        fee_growth_global_y: u128,
        protocol_fee_x: u64,
        protocol_fee_y: u64,
        liquidity: u128,
        ticks: Table<I32, TickInfo>,
        tick_bitmap: Table<I32, u256>,
        observations: vector<Observation>,
        reserve_x: Balance<CoinTypeA>,
        reserve_y: Balance<CoinTypeB>,
        locked: bool,
        reward_infos: vector<PoolRewardInfo>,
    }
    
    #[allow(unused_field)]
    struct PoolRewardInfo has copy, drop, store {
        reward_coin_type: TypeName,
        last_update_time: u64,
        ended_at_seconds: u64,
        total_reward: u64,
        total_reward_allocated: u64,
        reward_per_seconds: u128,
        reward_growth_global: u128,
    }

    #[allow(unused_field)]
    struct SwapReceipt {
        pool_id: ID,
        amount_x_debt: u64,
        amount_y_debt: u64,
    }
        
    public fun swap<T0, T1>(
        _pool: &mut Pool<T0, T1>, 
        _a2b: bool, 
        _by_amount_in: bool, 
        _amount: u64, 
        _sqrt_price_limit: u128, 
        _versioned: &Versioned, 
        _clock: &Clock, 
        _ctx: &TxContext
    ) : (Balance<T0>, Balance<T1>, SwapReceipt) {
        abort 0
    }

    public fun pay<T0, T1>(
        _pool: &mut Pool<T0, T1>, 
        _receipt: SwapReceipt, 
        _balance_a: Balance<T0>, 
        _balance_b: Balance<T1>, 
        _versioned: &Versioned, 
        _ctx: &TxContext
    ) {
        abort 0
    }
}
