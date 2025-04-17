#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::metastable;

use aftermath_mstable::vault::{Vault, DepositCap, WithdrawCap};
use aftermath_mstable::version::Version;
use std::type_name::TypeName;
use sui::coin::Coin;

public struct MetastableSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// deposit  coin => metacoin
public fun swap_a2b<CoinA, CoinB>(
    vault_info: &mut Vault<CoinB>,
    version: &Version,
    deposit_cap: DepositCap<CoinB, CoinA>,
    coin_in: Coin<CoinA>,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

// withdraw  metacoin => coin
public fun swap_b2a<CoinA, CoinB>(
    vault_info: &mut Vault<CoinB>,
    version: &Version,
    deposit_cap: WithdrawCap<CoinB, CoinA>,
    coin_in: Coin<CoinB>,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}
