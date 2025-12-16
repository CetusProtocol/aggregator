// Copyright (c) Cetus Technology Limited

#[allow(unused_type_parameter, unused_field)]
module magma::config {
    use magma::acl::ACL;
    use sui::vec_map::VecMap;

    // === Structs ===

    /// The clmmpools fee tier data
    public struct FeeTier has copy, drop, store {
        /// The tick spacing
        tick_spacing: u32,
        /// The default fee rate
        fee_rate: u64,
    }

    public struct GlobalConfig has key, store {
        id: UID,
        /// `protocol_fee_rate` The protocol fee rate
        protocol_fee_rate: u64,
        /// 'fee_tiers' The Clmmpools fee tire map
        fee_tiers: VecMap<u32, FeeTier>,
        /// `acl` The Clmmpools ACL
        acl: ACL,
        /// The current package version
        package_version: u64,
        alive_gauges: sui::vec_set::VecSet<ID>,
    }
}
