module flowx_clmm::versioned {
    use sui::object::UID;

    #[allow(unused_field)]
    struct Versioned has store, key {
        id: UID,
        version: u64,
    }
}

