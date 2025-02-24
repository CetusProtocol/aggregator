#[allow(unused_field)]
module steamm::quote;

public struct SwapFee has copy, drop, store {
    protocol_fees: u64,
    pool_fees: u64,
}
