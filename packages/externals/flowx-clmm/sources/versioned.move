#[allow(unused_field)]
module flowx_clmm::versioned;

use sui::object::UID;

public struct Versioned has key, store {
    id: UID,
    version: u64,
}
