// Copyright (c) Cetus Technology Limited

#[allow(unused_field)]
/// The `tick` module is a module that is designed to facilitate the management of `tick` owned by `Pool`.
/// All `tick` related operations of `Pool` are handled by this module.
module magma::tick {
    use magma_integer_mate::i128::I128;
    use magma_integer_mate::i32::I32;
    use magma_move_stl::skip_list::SkipList;

    /// Manager ticks of a pool, ticks is organized into SkipList.
    public struct TickManager has store {
        tick_spacing: u32,
        ticks: SkipList<Tick>,
    }

    /// Tick infos.
    public struct Tick has copy, drop, store {
        index: I32,
        sqrt_price: u128,
        liquidity_net: I128,
        liquidity_gross: u128,
        fee_growth_outside_a: u128,
        fee_growth_outside_b: u128,
        points_growth_outside: u128,
        rewards_growth_outside: vector<u128>,
        magma_distribution_staked_liquidity_net: I128,
        magma_distribution_growth_outside: u128,
    }
}
