// Copyright (c) Seed Labs

#[allow(unused_field, unused_variable, unused_type_parameter, unused_mut_parameter)]
/// Config Module
/// The config module stores the protocol configs and exposes methods for admin to update the config
/// and getter methods to retrive config values
module bluefin_spot::config;

use integer_mate::i32::I32;
use sui::object::UID;

//===========================================================//
//                         Constants                         //
//===========================================================//

/// The protocol's config
public struct GlobalConfig has key, store {
    id: UID,
    /// min tick supported
    min_tick: I32,
    /// max tick supported
    max_tick: I32,
    /// the current pkg version supported
    version: u64,
    /// Accounts that are whitelisted to update rewards on any pool
    reward_managers: vector<address>,
}
