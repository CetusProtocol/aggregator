module kriya_clmm::pool {
    use kriya_clmm::{i32::I32, oracle::Observation, tick::TickInfo};
    use std::type_name::TypeName;
    use sui::{balance::Balance, object::UID, table::Table};

    #[allow(unused_field)]
    struct Pool<phantom CoinTypeA, phantom CoinTypeB> has key {
        id: UID,
        type_x: TypeName,
        type_y: TypeName,
        sqrt_price: u128,
        liquidity: u128,
        tick_index: I32,
        tick_spacing: u32,
        max_liquidity_per_tick: u128,
        fee_growth_global_x: u128,
        fee_growth_global_y: u128,
        reserve_x: Balance<CoinTypeA>,
        reserve_y: Balance<CoinTypeB>,
        swap_fee_rate: u64,
        flash_loan_fee_rate: u64,
        protocol_fee_share: u64,
        protocol_flash_loan_fee_share: u64,
        protocol_fee_x: u64,
        protocol_fee_y: u64,
        ticks: Table<I32, TickInfo>,
        tick_bitmap: Table<I32, u256>,
        reward_infos: vector<PoolRewardInfo>,
        observation_index: u64,
        observation_cardinality: u64,
        observation_cardinality_next: u64,
        observations: vector<Observation>,
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
}
