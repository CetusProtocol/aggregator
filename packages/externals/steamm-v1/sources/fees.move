#[allow(unused_field)]
module steamm::fees;

use sui::balance::Balance;

public struct Fees<phantom T0, phantom T1> has store {
    config: FeeConfig,
    fee_a: Balance<T0>,
    fee_b: Balance<T1>,
}

public struct FeeConfig has copy, drop, store {
    fee_numerator: u64,
    fee_denominator: u64,
    min_fee: u64,
}
