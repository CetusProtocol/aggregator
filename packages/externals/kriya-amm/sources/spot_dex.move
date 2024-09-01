#[allow(unused_field)]
module kriya_amm::spot_dex {
    use sui::object::UID;
    use sui::balance;
    use sui::coin;
    use sui::tx_context;

    struct LSP<phantom CoinX, phantom CoinY> has drop {
        dummy_field: bool,
    }

    struct Pool<phantom CoinX, phantom CoinY> has key {
        id: UID,
        token_y: balance::Balance<CoinY>,
        token_x: balance::Balance<CoinX>,
        lsp_supply: balance::Supply<LSP<CoinX, CoinY>>,
        lsp_locked: balance::Balance<LSP<CoinX, CoinY>>,
        lp_fee_percent: u64,
        protocol_fee_percent: u64,
        protocol_fee_x: balance::Balance<CoinX>,
        protocol_fee_y: balance::Balance<CoinY>,
        is_stable: bool,
        scaleX: u64,
        scaleY: u64,
        is_swap_enabled: bool,
        is_deposit_enabled: bool,
        is_withdraw_enabled: bool,
    }

    public fun swap_token_x<CoinX, CoinY>(
        _pool: &mut Pool<CoinX, CoinY>,
        _coin_x: coin::Coin<CoinX>,
        _in_amount: u64,
        _min_received: u64,
        _ctx: &mut tx_context::TxContext
    ) : coin::Coin<CoinY> {
        abort 0
    }

    public fun swap_token_y<CoinX, CoinY>(
        _pool: &mut Pool<CoinX, CoinY>,
        _coin_y: coin::Coin<CoinY>,
        _in_amount: u64,
        _min_received: u64,
        _ctx: &mut tx_context::TxContext
    ) : coin::Coin<CoinX> {
        abort 0
    }
}
