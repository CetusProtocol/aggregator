// Copyright (c) Seed Labs

#[allow(unused_field, unused_variable, unused_type_parameter, unused_mut_parameter)]
/// Tick Module
/// The module is responsible for creating/managing/manipluating ticks information
module bluefin_spot::tick;

use integer_mate::i128::I128;
use integer_mate::i32::I32;
use integer_mate::i64::I64;
use sui::table::Table;

//===========================================================//
//                           Structs                         //
//===========================================================//

/// Ticks manager
/// Stores all current ticks and their bitmap
public struct TickManager has store {
    tick_spacing: u32,
    ticks: Table<I32, TickInfo>,
    bitmap: Table<I32, u256>,
}

/// Struct representing a single Tick
public struct TickInfo has copy, drop, store {
    index: I32,
    sqrt_price: u128,
    liquidity_gross: u128,
    liquidity_net: I128,
    fee_growth_outside_a: u128,
    fee_growth_outside_b: u128,
    tick_cumulative_out_side: I64,
    seconds_per_liquidity_out_side: u256,
    seconds_out_side: u64,
    reward_growths_outside: vector<u128>,
}
