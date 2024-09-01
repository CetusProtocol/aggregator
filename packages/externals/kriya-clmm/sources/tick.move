module kriya_clmm::tick {
    use kriya_clmm::{i64::I64, i128::I128};

    #[allow(unused_field)]
    struct TickInfo has copy, drop, store {
        liquidity_gross: u128,
        liquidity_net: I128,
        fee_growth_outside_x: u128,
        fee_growth_outside_y: u128,
        reward_growths_outside: vector<u128>,
        tick_cumulative_out_side: I64,
        seconds_per_liquidity_out_side: u256,
        seconds_out_side: u64,
    }
}

