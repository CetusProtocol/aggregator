#[allow(unused_field)]
module kriya_clmm::oracle;

use kriya_clmm::i64::I64;

public struct Observation has copy, drop, store {
    timestamp_s: u64,
    tick_cumulative: I64,
    seconds_per_liquidity_cumulative: u256,
    initialized: bool,
}
