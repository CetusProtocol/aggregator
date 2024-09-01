module kriya_clmm::version {
    use sui::object::UID;

    #[allow(unused_field)]
    struct Version has store, key {
        id: UID,
        major_version: u64,
        minor_version: u64,
    }
    
    struct VersionCap has store, key {
        id: UID,
    }
}

