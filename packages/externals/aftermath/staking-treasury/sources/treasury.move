module staking_treasury::treasury {
    use sui::bag::Bag;
    use sui::object::UID;

   #[allow(unused_field)]
    struct Treasury has key {
        id: UID,
        version: u64,
        funds: Bag
    }
}
