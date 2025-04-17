#[allow(unused_field)]
module kriya_amm::spot_dex;

use sui::balance;
use sui::coin;
use sui::object::UID;
use sui::tx_context;

public struct LSP<phantom CoinX, phantom CoinY> has drop {
    dummy_field: bool,
}

public struct Pool<phantom CoinX, phantom CoinY> has key {
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
