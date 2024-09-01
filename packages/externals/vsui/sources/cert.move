module vsui::cert{
    use sui::balance::Supply;
    use sui::object::UID;

    #[allow(unused_field)]
    struct CERT has drop {
        dummy_field: bool
    }

    #[allow(unused_field)]
    struct Metadata<phantom Ty0> has store, key {
        id: UID,
        version: u64,
        total_supply: Supply<Ty0>
    }
}