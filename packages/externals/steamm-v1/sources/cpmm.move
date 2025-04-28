#[allow(unused_field, unused_variable)]
module steamm::cpmm;

use steamm::pool::{Pool, SwapResult};
use steamm::version::Version;
use sui::coin::Coin;

public struct CpQuoter has store {
    version: Version,
    offset: u64,
}

public fun swap<T0, T1, T2: drop>(
    arg0: &mut Pool<T0, T1, CpQuoter, T2>,
    arg1: &mut Coin<T0>,
    arg2: &mut Coin<T1>,
    arg3: bool,
    arg4: u64,
    arg5: u64,
    arg6: &mut TxContext,
): SwapResult {
    abort 0
}
