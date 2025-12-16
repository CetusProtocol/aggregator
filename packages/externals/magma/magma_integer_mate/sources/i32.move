#[allow(unused_field, unused_variable)]
module magma_integer_mate::i32;

public struct I32 has copy, drop, store {
    bits: u32,
}

public fun zero(): I32 {
    abort 0
}

public fun from_u32(v: u32): I32 {
    abort 0
}

public fun from(v: u32): I32 {
    abort 0
}

public fun neg_from(v: u32): I32 {
    abort 0
}

public fun wrapping_add(num1: I32, num2: I32): I32 {
    abort 0
}

public fun add(num1: I32, num2: I32): I32 {
    abort 0
}

public fun wrapping_sub(num1: I32, num2: I32): I32 {
    abort 0
}

public fun sub(num1: I32, num2: I32): I32 {
    abort 0
}

public fun mul(num1: I32, num2: I32): I32 {
    abort 0
}

public fun div(num1: I32, num2: I32): I32 {
    abort 0
}

public fun abs(v: I32): I32 {
    abort 0
}

public fun abs_u32(v: I32): u32 {
    abort 0
}

public fun shl(v: I32, shift: u8): I32 {
    abort 0
}

public fun shr(v: I32, shift: u8): I32 {
    abort 0
}

public fun mod(v: I32, n: I32): I32 {
    abort 0
}

public fun as_u32(v: I32): u32 {
    abort 0
}

public fun sign(v: I32): u8 {
    abort 0
}

public fun is_neg(v: I32): bool {
    abort 0
}

public fun cmp(num1: I32, num2: I32): u8 {
    abort 0
}

public fun eq(num1: I32, num2: I32): bool {
    abort 0
}

public fun gt(num1: I32, num2: I32): bool {
    abort 0
}

public fun gte(num1: I32, num2: I32): bool {
    abort 0
}

public fun lt(num1: I32, num2: I32): bool {
    abort 0
}

public fun lte(num1: I32, num2: I32): bool {
    abort 0
}

public fun or(num1: I32, num2: I32): I32 {
    abort 0
}

public fun and(num1: I32, num2: I32): I32 {
    abort 0
}
