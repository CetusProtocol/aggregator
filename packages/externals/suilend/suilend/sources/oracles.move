/// This module contains logic for parsing pyth prices (and eventually switchboard prices)
module suilend::oracles;

use pyth::i64;
use pyth::price::{Self, Price};
use pyth::price_feed;
use pyth::price_identifier::PriceIdentifier;
use pyth::price_info::{Self, PriceInfoObject};
use sui::clock::{Self, Clock};
use suilend::decimal::{Self, Decimal, mul, div};

// min confidence ratio of X means that the confidence interval must be less than (100/x)% of the price
const MIN_CONFIDENCE_RATIO: u64 = 10;
const MAX_STALENESS_SECONDS: u64 = 60;

/// parse the pyth price info object to get a price and identifier. This function returns an None if the
/// price is invalid due to confidence interval checks or staleness checks. It returns None instead of aborting
/// so the caller can handle invalid prices gracefully by eg falling back to a different oracle
/// return type: (spot price, ema price, price identifier)
public fun get_pyth_price_and_identifier(
    price_info_obj: &PriceInfoObject,
    clock: &Clock,
): (Option<Decimal>, Decimal, PriceIdentifier) {
    let price_info = price_info::get_price_info_from_price_info_object(price_info_obj);
    let price_feed = price_info::get_price_feed(&price_info);
    let price_identifier = price_feed::get_price_identifier(price_feed);

    let ema_price = parse_price_to_decimal(price_feed::get_ema_price(price_feed));

    let price = price_feed::get_price(price_feed);
    let price_mag = i64::get_magnitude_if_positive(&price::get_price(&price));
    let conf = price::get_conf(&price);

    // confidence interval check
    // we want to make sure conf / price <= x%
    // -> conf * (100 / x )<= price
    if (conf * MIN_CONFIDENCE_RATIO > price_mag) {
        return (option::none(), ema_price, price_identifier)
    };

    // check current sui time against pythnet publish time. there can be some issues that arise because the
    // timestamps are from different sources and may get out of sync, but that's why we have a fallback oracle
    let cur_time_s = clock::timestamp_ms(clock) / 1000;
    if (
        cur_time_s > price::get_timestamp(&price) && // this is technically possible!
            cur_time_s - price::get_timestamp(&price) > MAX_STALENESS_SECONDS
    ) {
        return (option::none(), ema_price, price_identifier)
    };

    let spot_price = parse_price_to_decimal(price);
    (option::some(spot_price), ema_price, price_identifier)
}

fun parse_price_to_decimal(price: Price): Decimal {
    // suilend doesn't support negative prices
    let price_mag = i64::get_magnitude_if_positive(&price::get_price(&price));
    let expo = price::get_expo(&price);

    if (i64::get_is_negative(&expo)) {
        div(
            decimal::from(price_mag),
            decimal::from(std::u64::pow(10, (i64::get_magnitude_if_negative(&expo) as u8))),
        )
    } else {
        mul(
            decimal::from(price_mag),
            decimal::from(std::u64::pow(10, (i64::get_magnitude_if_positive(&expo) as u8))),
        )
    }
}

#[test_only]
fun example_price_identifier(): PriceIdentifier {
    use pyth::price_identifier::{Self};
    let mut v = vector::empty<u8>();

    let mut i = 0;
    while (i < 32) {
        vector::push_back(&mut v, 0);
        i = i + 1;
    };

    price_identifier::from_byte_vec(v)
}

#[test]
fun happy() {
    use sui::test_scenario::{Self};
    let owner = @0x26;
    let mut scenario = test_scenario::begin(owner);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let price_info_object = price_info::new_price_info_object_for_testing(
        price_info::new_price_info(
            0,
            0,
            price_feed::new(
                example_price_identifier(),
                price::new(
                    i64::new(8, false),
                    0,
                    i64::new(5, false),
                    0,
                ),
                price::new(
                    i64::new(8, false),
                    0,
                    i64::new(4, true),
                    0,
                ),
            ),
        ),
        test_scenario::ctx(&mut scenario),
    );
    let (spot_price, ema_price, price_identifier) = get_pyth_price_and_identifier(
        &price_info_object,
        &clock,
    );
    assert!(spot_price == option::some(decimal::from(800_000)), 0);
    assert!(ema_price == decimal::from_bps(8), 0);
    assert!(price_identifier == example_price_identifier(), 0);

    price_info::destroy(price_info_object);
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
fun confidence_interval_exceeded() {
    use sui::test_scenario::{Self};
    let owner = @0x26;
    let mut scenario = test_scenario::begin(owner);
    let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

    let price_info_object = price_info::new_price_info_object_for_testing(
        price_info::new_price_info(
            0,
            0,
            price_feed::new(
                example_price_identifier(),
                price::new(
                    i64::new(100, false),
                    11,
                    i64::new(5, false),
                    0,
                ),
                price::new(
                    i64::new(8, false),
                    0,
                    i64::new(4, true),
                    0,
                ),
            ),
        ),
        test_scenario::ctx(&mut scenario),
    );

    let (spot_price, ema_price, price_identifier) = get_pyth_price_and_identifier(
        &price_info_object,
        &clock,
    );

    // condience interval higher than 10% of the price
    assert!(spot_price == option::none(), 0);
    assert!(ema_price == decimal::from_bps(8), 0);
    assert!(price_identifier == example_price_identifier(), 0);

    price_info::destroy(price_info_object);
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
fun price_is_stale() {
    use sui::test_scenario::{Self};
    let owner = @0x26;
    let mut scenario = test_scenario::begin(owner);
    let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
    clock::set_for_testing(&mut clock, 61_000);

    let price_info_object = price_info::new_price_info_object_for_testing(
        price_info::new_price_info(
            0,
            0,
            price_feed::new(
                example_price_identifier(),
                price::new(
                    i64::new(100, false),
                    0,
                    i64::new(5, false),
                    0,
                ),
                price::new(
                    i64::new(8, false),
                    0,
                    i64::new(4, true),
                    0,
                ),
            ),
        ),
        test_scenario::ctx(&mut scenario),
    );

    let (spot_price, ema_price, price_identifier) = get_pyth_price_and_identifier(
        &price_info_object,
        &clock,
    );

    assert!(spot_price == option::none(), 0);
    assert!(ema_price == decimal::from_bps(8), 0);
    assert!(price_identifier == example_price_identifier(), 0);

    price_info::destroy(price_info_object);
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}
