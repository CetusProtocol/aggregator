#[allow(unused_field)]
module vsui::cert;

use sui::balance::Supply;
use sui::object::UID;

public struct CERT has drop {
    dummy_field: bool,
}

public struct Metadata<phantom Ty0> has key, store {
    id: UID,
    version: u64,
    total_supply: Supply<Ty0>,
}
