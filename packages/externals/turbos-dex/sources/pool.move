#[allow(unused_field)]
module turbos_dex::pool {
    use sui::object::UID;
    use sui::balance::Balance;
    use sui::table::Table;

    use std::string::String;
    use std::vector;

    use turbos_dex::i32::I32;

    struct Versioned has store, key {
    	id: UID,
	    version: u64
    }

    struct PoolRewardInfo has store, key {
        id: UID,
        vault: address,
        vault_coin_type: String,
        emissions_per_second: u128,
        growth_global: u128,
        manager: address
    }

    struct Pool<phantom CoinA, phantom CoinB, phantom Fee> has store, key {
        id: UID,
        coin_a: Balance<CoinA>,
        coin_b: Balance<CoinB>,
        protocol_fees_a: u64,
        protocol_fees_b: u64,
        sqrt_price: u128,
        tick_current_index: I32,
        tick_spacing: u32,
        max_liquidity_per_tick: u128,
        fee: u32,
        fee_protocol: u32,
        unlocked: bool,
        fee_growth_global_a: u128,
        fee_growth_global_b: u128,
        liquidity: u128,
        tick_map: Table<I32, u256>,
        deploy_time_ms: u64,
        reward_infos: vector<PoolRewardInfo>,
        reward_last_updated_time_ms: u64
    }
}
