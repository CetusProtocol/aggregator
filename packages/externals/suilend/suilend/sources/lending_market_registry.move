/// Top level object that tracks all lending markets.
/// Ensures that there is only one LendingMarket of each type.
/// Anyone can create a new LendingMarket via the registry.
module suilend::lending_market_registry {
    use std::type_name::{Self, TypeName};
    use sui::table::{Self, Table};
    use suilend::lending_market::{Self, LendingMarket, LendingMarketOwnerCap};

    // === Errors ===
    const EIncorrectVersion: u64 = 1;

    // === Constants ===
    const CURRENT_VERSION: u64 = 1;

    public struct Registry has key {
        id: UID,
        version: u64,
        lending_markets: Table<TypeName, ID>,
    }

    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            version: CURRENT_VERSION,
            lending_markets: table::new(ctx),
        };

        transfer::share_object(registry);
    }

    public fun create_lending_market<P>(
        registry: &mut Registry,
        ctx: &mut TxContext,
    ): (LendingMarketOwnerCap<P>, LendingMarket<P>) {
        assert!(registry.version == CURRENT_VERSION, EIncorrectVersion);

        let (owner_cap, lending_market) = lending_market::create_lending_market<P>(ctx);
        table::add(&mut registry.lending_markets, type_name::get<P>(), object::id(&lending_market));
        (owner_cap, lending_market)
    }

    #[test_only]
    public struct LENDING_MARKET_1 {}
    public struct LENDING_MARKET_2 {}

    #[test]
    fun test_happy() {
        use sui::test_utils::{Self};
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);

        init(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, owner);

        let mut registry = test_scenario::take_shared<Registry>(&scenario);

        let (owner_cap_1, lending_market_1) = create_lending_market<LENDING_MARKET_1>(
            &mut registry,
            test_scenario::ctx(&mut scenario),
        );

        let (owner_cap_2, lending_market_2) = create_lending_market<LENDING_MARKET_2>(
            &mut registry,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(registry);
        test_utils::destroy(owner_cap_1);
        test_utils::destroy(lending_market_1);
        test_utils::destroy(owner_cap_2);
        test_utils::destroy(lending_market_2);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0, location = sui::dynamic_field)]
    fun test_fail_duplicate_lending_market_type() {
        use sui::test_utils::{Self};
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);

        init(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, owner);

        let mut registry = test_scenario::take_shared<Registry>(&scenario);

        let (owner_cap_1, lending_market_1) = create_lending_market<LENDING_MARKET_1>(
            &mut registry,
            test_scenario::ctx(&mut scenario),
        );

        // this should fail
        let (owner_cap_1_too, lending_market_1_too) = create_lending_market<LENDING_MARKET_1>(
            &mut registry,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::return_shared(registry);
        test_utils::destroy(owner_cap_1);
        test_utils::destroy(owner_cap_1_too);
        test_utils::destroy(lending_market_1);
        test_utils::destroy(lending_market_1_too);
        test_scenario::end(scenario);
    }
}
