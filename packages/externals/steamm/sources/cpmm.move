#[allow(unused_field, unused_variable)]
module steamm::cpmm;

use steamm::version::Version;
use sui::coin::Coin;

public struct CpQuoter has store {
    version: Version,
    offset: u64,
}
