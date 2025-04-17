#[allow(unused_field)]
module aftermath_mstable::version;

public struct Version has key {
    id: 0x2::object::UID,
    version: u64,
}
