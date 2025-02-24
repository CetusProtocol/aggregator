module suilend::rate_limiter {
    use suilend::decimal::{Self, Decimal, add, sub, mul, div, le, saturating_sub};

    const EInvalidConfig: u64 = 0;
    const EInvalidTime: u64 = 1;
    const ERateLimitExceeded: u64 = 2;

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

    public fun new_config(window_duration: u64, max_outflow: u64): RateLimiterConfig {
        assert!(window_duration > 0, EInvalidConfig);
        RateLimiterConfig {
            window_duration,
            max_outflow,
        }
    }

    public fun new(config: RateLimiterConfig, cur_time: u64): RateLimiter {
        RateLimiter {
            config,
            prev_qty: decimal::from(0),
            window_start: cur_time,
            cur_qty: decimal::from(0),
        }
    }

    fun update_internal(rate_limiter: &mut RateLimiter, cur_time: u64) {
        assert!(cur_time >= rate_limiter.window_start, EInvalidTime);

        // |<-prev window->|<-cur window (cur_slot is in here)->|
        if (cur_time < rate_limiter.window_start + rate_limiter.config.window_duration) {
            return
        } else // |<-prev window->|<-cur window->| (cur_slot is in here) |
        if (cur_time < rate_limiter.window_start + 2 * rate_limiter.config.window_duration) {
            rate_limiter.prev_qty = rate_limiter.cur_qty;
            rate_limiter.window_start =
                rate_limiter.window_start + rate_limiter.config.window_duration;
            rate_limiter.cur_qty = decimal::from(0);
        } else // |<-prev window->|<-cur window->|<-cur window + 1->| ... | (cur_slot is in here) |
        {
            rate_limiter.prev_qty = decimal::from(0);
            rate_limiter.window_start = cur_time;
            rate_limiter.cur_qty = decimal::from(0);
        }
    }

    /// Calculate current outflow. Must only be called after update_internal()!
    fun current_outflow(rate_limiter: &RateLimiter, cur_time: u64): Decimal {
        // assume the prev_window's outflow is even distributed across the window
        // this isn't true, but it's a good enough approximation
        let prev_weight = div(
            sub(
                decimal::from(rate_limiter.config.window_duration),
                decimal::from(cur_time - rate_limiter.window_start + 1),
            ),
            decimal::from(rate_limiter.config.window_duration),
        );

        add(
            mul(rate_limiter.prev_qty, prev_weight),
            rate_limiter.cur_qty,
        )
    }

    /// update rate limiter with new quantity. errors if rate limit has been reached
    public fun process_qty(rate_limiter: &mut RateLimiter, cur_time: u64, qty: Decimal) {
        update_internal(rate_limiter, cur_time);

        rate_limiter.cur_qty = add(rate_limiter.cur_qty, qty);

        assert!(
            le(
                current_outflow(rate_limiter, cur_time),
                decimal::from(rate_limiter.config.max_outflow),
            ),
            ERateLimitExceeded,
        );
    }

    public fun remaining_outflow(rate_limiter: &mut RateLimiter, cur_time: u64): Decimal {
        update_internal(rate_limiter, cur_time);
        saturating_sub(
            decimal::from(rate_limiter.config.max_outflow),
            current_outflow(rate_limiter, cur_time),
        )
    }

    #[test]
    fun test_rate_limiter() {
        let mut rate_limiter = new(
            RateLimiterConfig {
                window_duration: 10,
                max_outflow: 100,
            },
            0,
        );

        process_qty(&mut rate_limiter, 0, decimal::from(100));

        let mut i = 0;
        while (i < 10) {
            assert!(current_outflow(&rate_limiter, i) == decimal::from(100), 0);
            i = i + 1;
        };

        i = 10;
        while (i < 19) {
            process_qty(&mut rate_limiter, i, decimal::from(10));
            assert!(current_outflow(&rate_limiter, i) == decimal::from(100), 0);
            assert!(remaining_outflow(&mut rate_limiter, i) == decimal::from(0), 0);
            i = i + 1;
        };

        process_qty(&mut rate_limiter, 100, decimal::from(100));
    }
}
