module hasui::vault {
    use sui::balance::Balance;
    use sui::object::UID;

    #[allow(unused_field)]
    struct Vault<phantom Ty0> has key, store {
        id: UID,
        cache_pool: Balance<Ty0>
    }
}