module flowx_clmm::versioned {
    use sui::object::UID;

    #[allow(unused_field)]
    struct Versioned has store, key {
        id: UID,
        version: u64,
    }

    public fun check_pause(arg0: &Versioned) {
        abort 0
    }

    public fun check_version(arg0: &Versioned) {
        abort 0
    }

    public fun is_paused(arg0: &Versioned): bool {
        abort 0
    }
}

