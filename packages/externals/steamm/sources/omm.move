#[allow(unused_field, unused_variable, unused_const, unused_use)]
module steamm::omm;

use steamm::version::Version;

public struct OracleQuoter has store {
    version: Version,
    // oracle params
    oracle_registry_id: ID,
    oracle_index_a: u64,
    oracle_index_b: u64,
    // coin info
    decimals_a: u8,
    decimals_b: u8,
}
