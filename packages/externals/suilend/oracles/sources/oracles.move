#[allow(unused_field, unused_variable, unused_const, unused_use)]
module oracles::oracles;

use oracles::oracle_decimal::OracleDecimal;
use oracles::version::{Self, Version};
use pyth::price_feed::PriceFeed;
use pyth::price_identifier::PriceIdentifier;
use pyth::price_info::PriceInfoObject;
use sui::bag::{Self, Bag};
use switchboard::aggregator::{Aggregator, CurrentResult};

/* Constants */
const CURRENT_VERSION: u16 = 1;

/* Errors */
const EInvalidAdminCap: u64 = 0;
const EInvalidOracleType: u64 = 1;

public struct OracleRegistry has key, store {
    id: UID,
    config: OracleRegistryConfig,
    oracles: vector<Oracle>,
    version: Version,
    extra_fields: Bag,
}

public struct NewRegistryEvent has copy, drop, store {
    registry_id: ID,
    admin_cap_id: ID,
    pyth_max_staleness_threshold_s: u64,
    pyth_max_confidence_interval_pct: u64,
    switchboard_max_staleness_threshold_s: u64,
    switchboard_max_confidence_interval_pct: u64,
}

public struct AdminCap has key, store {
    id: UID,
    oracle_registry_id: ID,
}

public struct OracleRegistryConfig has store {
    pyth_max_staleness_threshold_s: u64,
    pyth_max_confidence_interval_pct: u64,
    switchboard_max_staleness_threshold_s: u64,
    switchboard_max_confidence_interval_pct: u64,
    extra_fields: Bag,
}

public struct Oracle has store {
    oracle_type: OracleType,
    extra_fields: Bag,
}

public enum OracleType has copy, drop, store {
    Pyth {
        price_identifier: PriceIdentifier,
    },
    Switchboard {
        feed_id: ID,
    },
}

// hot potato ensures that price is fresh
public struct OraclePriceUpdate has drop {
    oracle_registry_id: ID,
    oracle_index: u64,
    price: OracleDecimal,
    ema_price: Option<OracleDecimal>,
    metadata: OracleMetadata,
}

public enum OracleMetadata has copy, drop, store {
    Pyth {
        price_feed: PriceFeed,
    },
    Switchboard {
        current_result: CurrentResult,
    },
}
