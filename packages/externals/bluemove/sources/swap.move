#[allow(unused_field)]
module bluemove::swap;

public struct Dex_Info has key, store {
    id: sui::object::UID,
    fee_to: address,
    dev: address,
    total_pool_created: u64,
}
