#[allow(unused_field)]
module flowx_amm::factory {
    use sui::object::UID;
    use sui::bag::Bag;

    use flowx_amm::treasury::Treasury;

    struct Container has key {
        id: UID,
        pairs: Bag,
        treasury: Treasury,
    }
}
