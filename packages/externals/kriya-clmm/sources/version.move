#[allow(unused_field)]
module kriya_clmm::version;

use sui::object::UID;

public struct Version has key, store {
    id: UID,
    major_version: u64,
    minor_version: u64,
}

public struct VersionCap has key, store {
    id: UID,
}
