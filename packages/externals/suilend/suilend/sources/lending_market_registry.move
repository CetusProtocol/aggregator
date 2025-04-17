#[allow(unused_field)]
module suilend::lending_market_registry;

use std::type_name::TypeName;
use sui::object::UID;
use sui::table::Table;

public struct Registry has key {
    id: UID,
    version: u64,
    lending_markets: Table<TypeName, ID>,
}
