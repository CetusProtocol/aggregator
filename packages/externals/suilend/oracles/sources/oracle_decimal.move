#[allow(unused_field, unused_variable)]
module oracles::oracle_decimal;

public struct OracleDecimal has copy, drop, store {
    base: u128,
    expo: u64,
    is_expo_negative: bool,
}

public fun new(base: u128, expo: u64, is_expo_negative: bool): OracleDecimal {
    abort 0
}

public fun base(decimal: &OracleDecimal): u128 {
    abort 0
}

public fun expo(decimal: &OracleDecimal): u64 {
    abort 0
}

public fun is_expo_negative(decimal: &OracleDecimal): bool {
    abort 0
}
