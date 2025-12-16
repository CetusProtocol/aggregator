// Copyright (c) Cetus Technology Limited

#[allow(unused_type_parameter, unused_field)]
/// The `position` module is designed for the convenience of the `Pool`'s position and all `position` related
/// operations are completed by this module. Regarding the `position` of `clmmpool`,
/// there are several points that need to be explained:
///
/// 1. `clmmpool` specifies the ownership of the `position` through an `Object` named `position_nft`,
/// rather than a wallet address. This means that whoever owns the `position_nft` owns the position it holds.
/// This also means that `clmmpool`'s `position` can be transferred between users freely.
/// 2. `position_nft` records some basic information about the position, but these data do not participate in the
/// related calculations of the position, they are only used for display. The data that actually participates in the
/// calculation is stored in `position_info`, which corresponds one-to-one with `position_nft` and is stored in
/// `PositionManager`. The reason for this design is that in our other contracts, we need to read the information of
/// multiple positions in the `Pool`.
module magma::position {
    use magma_integer_mate::i32::I32;
    use magma_move_stl::linked_table;
    use std::string::String;
    use std::type_name::TypeName;

    /// The Cetus clmmpool's position manager, which has only store ability.
    /// The `PositionInfo` is organized into a linked table.
    public struct PositionManager has store {
        tick_spacing: u32,
        position_index: u64,
        positions: linked_table::LinkedTable<ID, PositionInfo>,
    }

    /// The Cetus clmmpool's position NFT.
    public struct Position has key, store {
        id: UID,
        pool: ID,
        index: u64,
        coin_type_a: TypeName,
        coin_type_b: TypeName,
        name: String,
        description: String,
        url: String,
        tick_lower_index: I32,
        tick_upper_index: I32,
        liquidity: u128,
    }

    /// The Cetus clmmpool's position information.
    public struct PositionInfo has copy, drop, store {
        position_id: ID,
        liquidity: u128,
        tick_lower_index: I32,
        tick_upper_index: I32,
        fee_growth_inside_a: u128,
        fee_growth_inside_b: u128,
        fee_owned_a: u64,
        fee_owned_b: u64,
        points_owned: u128,
        points_growth_inside: u128,
        rewards: vector<PositionReward>,
    }

    /// The Position's rewarder
    public struct PositionReward has copy, drop, store {
        growth_inside: u128,
        amount_owned: u64,
    }
}
