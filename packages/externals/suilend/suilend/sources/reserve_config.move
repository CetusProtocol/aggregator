/// parameters for a Reserve.
module suilend::reserve_config {
    use sui::bag::{Self, Bag};
    use suilend::decimal::{Self, Decimal, add, sub, mul, div, ge, le};

    #[test_only]
    use sui::test_scenario::{Self};

    const EInvalidReserveConfig: u64 = 0;
    const EInvalidUtil: u64 = 1;

    public struct ReserveConfig has store {
        // risk params
        open_ltv_pct: u8,
        close_ltv_pct: u8,
        max_close_ltv_pct: u8, // unused
        borrow_weight_bps: u64,
        // deposit limit in token amounts
        deposit_limit: u64,
        // borrow limit in token amounts
        borrow_limit: u64,
        // extra withdraw amount as bonus for liquidators
        liquidation_bonus_bps: u64,
        max_liquidation_bonus_bps: u64, // unused
        // deposit limit in usd
        deposit_limit_usd: u64,
        // borrow limit in usd
        borrow_limit_usd: u64,
        // interest params
        interest_rate_utils: vector<u8>,
        // in basis points
        interest_rate_aprs: vector<u64>,
        // fees
        borrow_fee_bps: u64,
        spread_fee_bps: u64,
        // extra withdraw amount as fee for protocol on liquidations
        protocol_liquidation_fee_bps: u64,
        // if true, the asset cannot be used as collateral
        // and can only be borrowed in isolation
        isolated: bool,
        // unused
        open_attributed_borrow_limit_usd: u64,
        close_attributed_borrow_limit_usd: u64,
        additional_fields: Bag,
    }

    public struct ReserveConfigBuilder has store {
        fields: Bag,
    }

    public fun create_reserve_config(
        open_ltv_pct: u8,
        close_ltv_pct: u8,
        max_close_ltv_pct: u8,
        borrow_weight_bps: u64,
        deposit_limit: u64,
        borrow_limit: u64,
        liquidation_bonus_bps: u64,
        max_liquidation_bonus_bps: u64,
        deposit_limit_usd: u64,
        borrow_limit_usd: u64,
        borrow_fee_bps: u64,
        spread_fee_bps: u64,
        protocol_liquidation_fee_bps: u64,
        interest_rate_utils: vector<u8>,
        interest_rate_aprs: vector<u64>,
        isolated: bool,
        open_attributed_borrow_limit_usd: u64,
        close_attributed_borrow_limit_usd: u64,
        ctx: &mut TxContext,
    ): ReserveConfig {
        let config = ReserveConfig {
            open_ltv_pct,
            close_ltv_pct,
            max_close_ltv_pct,
            borrow_weight_bps,
            deposit_limit,
            borrow_limit,
            liquidation_bonus_bps,
            max_liquidation_bonus_bps,
            deposit_limit_usd,
            borrow_limit_usd,
            interest_rate_utils,
            interest_rate_aprs,
            borrow_fee_bps,
            spread_fee_bps,
            protocol_liquidation_fee_bps,
            isolated,
            open_attributed_borrow_limit_usd,
            close_attributed_borrow_limit_usd,
            additional_fields: bag::new(ctx),
        };

        validate_reserve_config(&config);
        config
    }

    fun validate_reserve_config(config: &ReserveConfig) {
        assert!(config.open_ltv_pct <= 100, EInvalidReserveConfig);
        assert!(config.close_ltv_pct <= 100, EInvalidReserveConfig);
        assert!(config.max_close_ltv_pct <= 100, EInvalidReserveConfig);

        assert!(config.open_ltv_pct <= config.close_ltv_pct, EInvalidReserveConfig);
        assert!(config.close_ltv_pct <= config.max_close_ltv_pct, EInvalidReserveConfig);

        assert!(config.borrow_weight_bps >= 10_000, EInvalidReserveConfig);
        assert!(
            config.liquidation_bonus_bps <= config.max_liquidation_bonus_bps,
            EInvalidReserveConfig,
        );
        assert!(
            config.max_liquidation_bonus_bps + config.protocol_liquidation_fee_bps <= 2_000,
            EInvalidReserveConfig,
        );

        if (config.isolated) {
            assert!(config.open_ltv_pct == 0 && config.close_ltv_pct == 0, EInvalidReserveConfig);
        };

        assert!(config.borrow_fee_bps <= 10_000, EInvalidReserveConfig);
        assert!(config.spread_fee_bps <= 10_000, EInvalidReserveConfig);

        assert!(
            config.open_attributed_borrow_limit_usd <= config.close_attributed_borrow_limit_usd,
            EInvalidReserveConfig,
        );

        validate_utils_and_aprs(&config.interest_rate_utils, &config.interest_rate_aprs);
    }

    fun validate_utils_and_aprs(utils: &vector<u8>, aprs: &vector<u64>) {
        assert!(vector::length(utils) >= 2, EInvalidReserveConfig);
        assert!(vector::length(utils) == vector::length(aprs), EInvalidReserveConfig);

        let length = vector::length(utils);
        assert!(*vector::borrow(utils, 0) == 0, EInvalidReserveConfig);
        assert!(*vector::borrow(utils, length-1) == 100, EInvalidReserveConfig);

        // check that:
        // - utils is strictly increasing
        // - aprs is monotonically increasing
        let mut i = 1;
        while (i < length) {
            assert!(
                *vector::borrow(utils, i - 1) < *vector::borrow(utils, i),
                EInvalidReserveConfig,
            );
            assert!(
                *vector::borrow(aprs, i - 1) <= *vector::borrow(aprs, i),
                EInvalidReserveConfig,
            );

            i = i + 1;
        }
    }

    public fun open_ltv(config: &ReserveConfig): Decimal {
        decimal::from_percent(config.open_ltv_pct)
    }

    public fun close_ltv(config: &ReserveConfig): Decimal {
        decimal::from_percent(config.close_ltv_pct)
    }

    public fun borrow_weight(config: &ReserveConfig): Decimal {
        decimal::from_bps(config.borrow_weight_bps)
    }

    public fun deposit_limit(config: &ReserveConfig): u64 {
        config.deposit_limit
    }

    public fun borrow_limit(config: &ReserveConfig): u64 {
        config.borrow_limit
    }

    public fun liquidation_bonus(config: &ReserveConfig): Decimal {
        decimal::from_bps(config.liquidation_bonus_bps)
    }

    public fun deposit_limit_usd(config: &ReserveConfig): u64 {
        config.deposit_limit_usd
    }

    public fun borrow_limit_usd(config: &ReserveConfig): u64 {
        config.borrow_limit_usd
    }

    public fun borrow_fee(config: &ReserveConfig): Decimal {
        decimal::from_bps(config.borrow_fee_bps)
    }

    public fun protocol_liquidation_fee(config: &ReserveConfig): Decimal {
        decimal::from_bps(config.protocol_liquidation_fee_bps)
    }

    public fun isolated(config: &ReserveConfig): bool {
        config.isolated
    }

    public fun spread_fee(config: &ReserveConfig): Decimal {
        decimal::from_bps(config.spread_fee_bps)
    }

    public fun calculate_apr(config: &ReserveConfig, cur_util: Decimal): Decimal {
        assert!(le(cur_util, decimal::from(1)), EInvalidUtil);

        let length = vector::length(&config.interest_rate_utils);

        let mut i = 1;
        while (i < length) {
            let left_util = decimal::from_percent(
                *vector::borrow(&config.interest_rate_utils, i - 1),
            );
            let right_util = decimal::from_percent(*vector::borrow(&config.interest_rate_utils, i));

            if (ge(cur_util, left_util) && le(cur_util, right_util)) {
                let left_apr = decimal::from_bps(
                    *vector::borrow(&config.interest_rate_aprs, i - 1),
                );
                let right_apr = decimal::from_bps(*vector::borrow(&config.interest_rate_aprs, i));

                let weight = div(
                    sub(cur_util, left_util),
                    sub(right_util, left_util),
                );

                let apr_diff = sub(right_apr, left_apr);
                return add(
                        left_apr,
                        mul(weight, apr_diff),
                    )
            };

            i = i + 1;
        };

        // should never get here
        assert!(1 == 0, EInvalidReserveConfig);
        decimal::from(0)
    }

    public fun calculate_supply_apr(
        config: &ReserveConfig,
        cur_util: Decimal,
        borrow_apr: Decimal,
    ): Decimal {
        let spread_fee = spread_fee(config);
        mul(mul(sub(decimal::from(1), spread_fee), borrow_apr), cur_util)
    }

    public fun destroy(config: ReserveConfig) {
        let ReserveConfig {
            open_ltv_pct: _,
            close_ltv_pct: _,
            max_close_ltv_pct: _,
            borrow_weight_bps: _,
            deposit_limit: _,
            borrow_limit: _,
            liquidation_bonus_bps: _,
            max_liquidation_bonus_bps: _,
            deposit_limit_usd: _,
            borrow_limit_usd: _,
            interest_rate_utils: _,
            interest_rate_aprs: _,
            borrow_fee_bps: _,
            spread_fee_bps: _,
            protocol_liquidation_fee_bps: _,
            isolated: _,
            open_attributed_borrow_limit_usd: _,
            close_attributed_borrow_limit_usd: _,
            additional_fields,
        } = config;

        bag::destroy_empty(additional_fields);
    }

    public fun from(config: &ReserveConfig, ctx: &mut TxContext): ReserveConfigBuilder {
        let mut builder = ReserveConfigBuilder { fields: bag::new(ctx) };
        set_open_ltv_pct(&mut builder, config.open_ltv_pct);
        set_close_ltv_pct(&mut builder, config.close_ltv_pct);
        set_max_close_ltv_pct(&mut builder, config.max_close_ltv_pct);
        set_borrow_weight_bps(&mut builder, config.borrow_weight_bps);
        set_deposit_limit(&mut builder, config.deposit_limit);
        set_borrow_limit(&mut builder, config.borrow_limit);
        set_liquidation_bonus_bps(&mut builder, config.liquidation_bonus_bps);
        set_max_liquidation_bonus_bps(&mut builder, config.max_liquidation_bonus_bps);
        set_deposit_limit_usd(&mut builder, config.deposit_limit_usd);
        set_borrow_limit_usd(&mut builder, config.borrow_limit_usd);

        set_interest_rate_utils(&mut builder, config.interest_rate_utils);
        set_interest_rate_aprs(&mut builder, config.interest_rate_aprs);

        set_borrow_fee_bps(&mut builder, config.borrow_fee_bps);
        set_spread_fee_bps(&mut builder, config.spread_fee_bps);
        set_protocol_liquidation_fee_bps(&mut builder, config.protocol_liquidation_fee_bps);
        set_isolated(&mut builder, config.isolated);
        set_open_attributed_borrow_limit_usd(&mut builder, config.open_attributed_borrow_limit_usd);
        set_close_attributed_borrow_limit_usd(
            &mut builder,
            config.close_attributed_borrow_limit_usd,
        );

        builder
    }

    fun set<K: copy + drop + store, V: store + drop>(
        builder: &mut ReserveConfigBuilder,
        field: K,
        value: V,
    ) {
        if (bag::contains(&builder.fields, field)) {
            let val: &mut V = bag::borrow_mut(&mut builder.fields, field);
            *val = value;
        } else {
            bag::add(&mut builder.fields, field, value);
        }
    }

    public fun set_open_ltv_pct(builder: &mut ReserveConfigBuilder, open_ltv_pct: u8) {
        set(builder, b"open_ltv_pct", open_ltv_pct);
    }

    public fun set_close_ltv_pct(builder: &mut ReserveConfigBuilder, close_ltv_pct: u8) {
        set(builder, b"close_ltv_pct", close_ltv_pct);
    }

    public fun set_max_close_ltv_pct(builder: &mut ReserveConfigBuilder, max_close_ltv_pct: u8) {
        set(builder, b"max_close_ltv_pct", max_close_ltv_pct);
    }

    public fun set_borrow_weight_bps(builder: &mut ReserveConfigBuilder, borrow_weight_bps: u64) {
        set(builder, b"borrow_weight_bps", borrow_weight_bps);
    }

    public fun set_deposit_limit(builder: &mut ReserveConfigBuilder, deposit_limit: u64) {
        set(builder, b"deposit_limit", deposit_limit);
    }

    public fun set_borrow_limit(builder: &mut ReserveConfigBuilder, borrow_limit: u64) {
        set(builder, b"borrow_limit", borrow_limit);
    }

    public fun set_liquidation_bonus_bps(
        builder: &mut ReserveConfigBuilder,
        liquidation_bonus_bps: u64,
    ) {
        set(builder, b"liquidation_bonus_bps", liquidation_bonus_bps);
    }

    public fun set_max_liquidation_bonus_bps(
        builder: &mut ReserveConfigBuilder,
        max_liquidation_bonus_bps: u64,
    ) {
        set(builder, b"max_liquidation_bonus_bps", max_liquidation_bonus_bps);
    }

    public fun set_deposit_limit_usd(builder: &mut ReserveConfigBuilder, deposit_limit_usd: u64) {
        set(builder, b"deposit_limit_usd", deposit_limit_usd);
    }

    public fun set_borrow_limit_usd(builder: &mut ReserveConfigBuilder, borrow_limit_usd: u64) {
        set(builder, b"borrow_limit_usd", borrow_limit_usd);
    }

    public fun set_interest_rate_utils(
        builder: &mut ReserveConfigBuilder,
        interest_rate_utils: vector<u8>,
    ) {
        set(builder, b"interest_rate_utils", interest_rate_utils);
    }

    public fun set_interest_rate_aprs(
        builder: &mut ReserveConfigBuilder,
        interest_rate_aprs: vector<u64>,
    ) {
        set(builder, b"interest_rate_aprs", interest_rate_aprs);
    }

    public fun set_borrow_fee_bps(builder: &mut ReserveConfigBuilder, borrow_fee_bps: u64) {
        set(builder, b"borrow_fee_bps", borrow_fee_bps);
    }

    public fun set_spread_fee_bps(builder: &mut ReserveConfigBuilder, spread_fee_bps: u64) {
        set(builder, b"spread_fee_bps", spread_fee_bps);
    }

    public fun set_protocol_liquidation_fee_bps(
        builder: &mut ReserveConfigBuilder,
        protocol_liquidation_fee_bps: u64,
    ) {
        set(builder, b"protocol_liquidation_fee_bps", protocol_liquidation_fee_bps);
    }

    public fun set_isolated(builder: &mut ReserveConfigBuilder, isolated: bool) {
        set(builder, b"isolated", isolated);
    }

    public fun set_open_attributed_borrow_limit_usd(
        builder: &mut ReserveConfigBuilder,
        open_attributed_borrow_limit_usd: u64,
    ) {
        set(builder, b"open_attributed_borrow_limit_usd", open_attributed_borrow_limit_usd);
    }

    public fun set_close_attributed_borrow_limit_usd(
        builder: &mut ReserveConfigBuilder,
        close_attributed_borrow_limit_usd: u64,
    ) {
        set(builder, b"close_attributed_borrow_limit_usd", close_attributed_borrow_limit_usd);
    }

    public fun build(mut builder: ReserveConfigBuilder, tx_context: &mut TxContext): ReserveConfig {
        let config = create_reserve_config(
            bag::remove(&mut builder.fields, b"open_ltv_pct"),
            bag::remove(&mut builder.fields, b"close_ltv_pct"),
            bag::remove(&mut builder.fields, b"max_close_ltv_pct"),
            bag::remove(&mut builder.fields, b"borrow_weight_bps"),
            bag::remove(&mut builder.fields, b"deposit_limit"),
            bag::remove(&mut builder.fields, b"borrow_limit"),
            bag::remove(&mut builder.fields, b"liquidation_bonus_bps"),
            bag::remove(&mut builder.fields, b"max_liquidation_bonus_bps"),
            bag::remove(&mut builder.fields, b"deposit_limit_usd"),
            bag::remove(&mut builder.fields, b"borrow_limit_usd"),
            bag::remove(&mut builder.fields, b"borrow_fee_bps"),
            bag::remove(&mut builder.fields, b"spread_fee_bps"),
            bag::remove(&mut builder.fields, b"protocol_liquidation_fee_bps"),
            bag::remove(&mut builder.fields, b"interest_rate_utils"),
            bag::remove(&mut builder.fields, b"interest_rate_aprs"),
            bag::remove(&mut builder.fields, b"isolated"),
            bag::remove(&mut builder.fields, b"open_attributed_borrow_limit_usd"),
            bag::remove(&mut builder.fields, b"close_attributed_borrow_limit_usd"),
            tx_context,
        );

        let ReserveConfigBuilder { fields } = builder;
        bag::destroy_empty(fields);
        config
    }

    // === Tests ==
    #[test]
    fun test_calculate_apr() {
        let mut config = default_reserve_config();
        config.interest_rate_utils = {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 10);
                vector::push_back(&mut v, 100);
                v
            };
        config.interest_rate_aprs = {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 10000);
                vector::push_back(&mut v, 100000);
                v
            };

        assert!(calculate_apr(&config, decimal::from_percent(0)) == decimal::from(0), 0);
        assert!(calculate_apr(&config, decimal::from_percent(5)) == decimal::from_percent(50), 0);
        assert!(calculate_apr(&config, decimal::from_percent(10)) == decimal::from_percent(100), 0);
        assert!(
            calculate_apr(&config, decimal::from_percent(55)) == decimal::from_percent_u64(550),
            0,
        );
        assert!(
            calculate_apr(&config, decimal::from_percent(100)) == decimal::from_percent_u64(1000),
            0,
        );

        destroy(config);
    }

    #[test]
    fun test_valid_reserve_config() {
        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);

        let mut utils = vector::empty();
        vector::push_back(&mut utils, 0);
        vector::push_back(&mut utils, 100);

        let mut aprs = vector::empty();
        vector::push_back(&mut aprs, 0);
        vector::push_back(&mut aprs, 100);

        let config = create_reserve_config(
            10,
            10,
            10,
            10_000,
            1,
            1,
            5,
            5,
            100000,
            100000,
            10,
            2000,
            30,
            utils,
            aprs,
            false,
            0,
            0,
            test_scenario::ctx(&mut scenario),
        );

        destroy(config);
        test_scenario::end(scenario);
    }

    // TODO: there are so many other invalid states to test
    #[test]
    #[expected_failure(abort_code = EInvalidReserveConfig)]
    fun test_invalid_reserve_config() {
        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);

        let config = create_reserve_config(
            // open ltv pct
            10,
            // close ltv pct
            9,
            // max close ltv pct
            10,
            // borrow weight bps
            10_000,
            // deposit_limit
            1,
            // borrow_limit
            1,
            // liquidation bonus pct
            5,
            // max liquidation bonus pct
            5,
            10,
            10,
            // borrow fee bps
            10,
            // spread fee bps
            2000,
            // liquidation fee bps
            3000,
            // utils
            {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 100);
                v
            },
            // aprs
            {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 100);
                v
            },
            false,
            0,
            0,
            test_scenario::ctx(&mut scenario),
        );

        destroy(config);
        test_scenario::end(scenario);
    }

    #[test_only]
    public fun default_reserve_config(): ReserveConfig {
        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);

        let config = create_reserve_config(
            // open ltv pct
            0,
            // close ltv pct
            0,
            // max close ltv pct
            0,
            // borrow weight bps
            10_000,
            // deposit_limit
            18_446_744_073_709_551_615,
            // borrow_limit
            18_446_744_073_709_551_615,
            // liquidation bonus pct
            0,
            // max liquidation bonus pct
            0,
            // deposit_limit_usd
            18_446_744_073_709_551_615,
            // borrow_limit_usd
            18_446_744_073_709_551_615,
            // borrow fee bps
            0,
            // spread fee bps
            0,
            // liquidation fee bps
            0,
            // utils
            {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 100);
                v
            },
            // aprs
            {
                let mut v = vector::empty();
                vector::push_back(&mut v, 0);
                vector::push_back(&mut v, 0);
                v
            },
            false,
            18_446_744_073_709_551_615,
            18_446_744_073_709_551_615,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::end(scenario);
        config
    }
}
