#[allow(unused_field)]
module vsui::unstake_ticket;

use sui::object::UID;
use sui::table::Table;

public struct Metadata has key, store {
    id: UID,
    version: u64,
    total_supply: u64,
    max_history_value: Table<u64, u64>,
}
