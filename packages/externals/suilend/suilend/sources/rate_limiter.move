module suilend::rate_limiter;

use suilend::decimal::Decimal;

public struct RateLimiter has copy, drop, store {
    /// configuration parameters
    config: RateLimiterConfig,
    // state
    /// prev qty is the sum of all outflows from [window_start - config.window_duration, window_start)
    prev_qty: Decimal,
    /// time when window started
    window_start: u64,
    /// cur qty is the sum of all outflows from [window_start, window_start + config.window_duration)
    cur_qty: Decimal,
}

public struct RateLimiterConfig has copy, drop, store {
    /// Rate limiter window duration
    window_duration: u64,
    /// Rate limiter param. Max outflow in a window
    max_outflow: u64,
}
