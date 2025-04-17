#[allow(unused_field)]
module flowx_clmm::pool_manager;

use sui::object::UID;
use sui::table::Table;

public struct PoolRegistry has key, store {
    id: UID,
    fee_amount_tick_spacing: Table<u64, u32>,
    num_pools: u64,
}
