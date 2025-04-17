/// fixed point decimal representation. 18 decimal places are kept.
module suilend::decimal;

public struct Decimal has copy, drop, store {
    value: u256,
}
