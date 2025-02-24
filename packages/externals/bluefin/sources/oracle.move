// Copyright (c) Seed Labs

#[allow(unused_field, unused_variable, unused_type_parameter, unused_mut_parameter)]
/// Oracle Module
/// This module is responsible for managing observations needed for oracle price
/// More on this over here: https://uniswapv3book.com/milestone_5/price-oracle.html
module bluefin_spot::oracle;

use integer_mate::i64::I64;

//===========================================================//
//                           Structs                         //
//===========================================================//

/// Observation Manager to keep track of all available
/// observations and the current/next cardinality
public struct ObservationManager has copy, drop, store {
    observations: vector<Observation>,
    observation_index: u64,
    observation_cardinality: u64,
    observation_cardinality_next: u64,
}

/// Struct representing a single observation
public struct Observation has copy, drop, store {
    timestamp: u64,
    tick_cumulative: I64,
    seconds_per_liquidity_cumulative: u256,
    initialized: bool,
}
