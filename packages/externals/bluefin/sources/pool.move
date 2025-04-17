#[allow(unused_field, unused_variable, unused_type_parameter, unused_mut_parameter)]
module bluefin_spot::pool;

use bluefin_spot::config::GlobalConfig;
use bluefin_spot::oracle::ObservationManager;
use bluefin_spot::tick::{TickManager, TickInfo};
use integer_mate::i32::I32;
use std::string::String;
use sui::balance::Balance;
use sui::clock::Clock;
use sui::object::{UID, ID};
use sui::tx_context::TxContext;

//===========================================================//
//                           Structs                         //
//===========================================================//

/// Represents a pool
public struct Pool<phantom CoinTypeA, phantom CoinTypeB> has key, store {
    // Id of the pool
    id: UID,
    // The name of the pool
    name: String,
    // Amount of Coin A locked in pool
    coin_a: Balance<CoinTypeA>,
    // Amount of Coin B locked in pool
    coin_b: Balance<CoinTypeB>,
    // The fee in basis points. 1 bps is represented as 100, 5 as 500
    fee_rate: u64,
    // the percentage of fee that will go to protocol
    protocol_fee_share: u64,
    // Variable to track the fee accumulated in coin A
    fee_growth_global_coin_a: u128,
    // Variable to track the fee accumulated in coin B
    fee_growth_global_coin_b: u128,
    // Variable to track the accrued protocol fee of coin A
    protocol_fee_coin_a: u64,
    // Variable to track the accrued protocol fee of coin B
    protocol_fee_coin_b: u64,
    // The tick manager
    ticks_manager: TickManager,
    // The observations manager
    observations_manager: ObservationManager,
    // Current sqrt(P) in Q96 notation
    current_sqrt_price: u128,
    // The current tick index
    current_tick_index: I32,
    // The amount of liquidity (L) in the pool currently
    liquidity: u128,
    // Vector holding the information for different pool rewards
    reward_infos: vector<PoolRewardInfo>,
    // Is the pool paused
    is_paused: bool,
    // url of the pool logo
    icon_url: String,
    // position index number
    position_index: u128,
    // a incrementor, updated every time pool state is changed
    sequence_number: u128,
}

/// Represents reward configs inside a pool
public struct PoolRewardInfo has copy, drop, store {
    // symbol of reward coin
    reward_coin_symbol: String,
    // decimals of the reward coin
    reward_coin_decimals: u8,
    // type string of the reward coin
    reward_coin_type: String,
    // last time the data of this coin was changed.
    last_update_time: u64,
    //timestamp at which the rewards will finish
    ended_at_seconds: u64,
    // total coins to be emitted
    total_reward: u64,
    // total reward collectable at the moment
    total_reward_allocated: u64,
    // amount of reward to be emitted per second
    reward_per_seconds: u128,
    // global values used to distribute rewards
    reward_growth_global: u128,
}
