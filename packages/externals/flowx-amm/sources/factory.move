#[allow(unused_field)]
module flowx_amm::factory;

use flowx_amm::treasury::Treasury;
use sui::bag::Bag;
use sui::object::UID;

public struct Container has key {
    id: UID,
    pairs: Bag,
    treasury: Treasury,
}
