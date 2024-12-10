module bluemove::swap {

    #[allow(unused_field)]
    struct LSP<phantom Ty0, phantom Ty1> has drop {
        dummy_field: bool
    }

    #[allow(unused_field)]
    struct Pool<phantom T0, phantom T1> has store, key {
        id: sui::object::UID,
        creator: address,
        token_x: 0x2::balance::Balance<T0>,
        token_y: 0x2::balance::Balance<T1>,
        lsp_supply: 0x2::balance::Supply<LSP<T0, T1>>,
        fee_amount: 0x2::balance::Balance<LSP<T0, T1>>,
        fee_x: 0x2::balance::Balance<T0>,
        fee_y: 0x2::balance::Balance<T1>,
        minimum_liq: 0x2::balance::Balance<LSP<T0, T1>>,
        k_last: u128,
        reserve_x: u64,
        reserve_y: u64,
        is_freeze: bool,
    }

    #[allow(unused_field)]
    struct Dex_Info has store, key {
        id: sui::object::UID,
        fee_to: address,
        dev: address,
        total_pool_created: u64,
    }
}
