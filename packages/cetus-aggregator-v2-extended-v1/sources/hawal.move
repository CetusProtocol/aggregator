#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2_extend_v1::hawal;

use hawal::hawal::HAWAL;
use hawal::walstaking::Staking;
use std::type_name::TypeName;
use sui::coin::Coin;
use wal::wal::WAL;
use walrus::staking::Staking as WalStaking;

public struct HawalSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

// mint st_sui: sui -> st_sui
public fun swap_a2b(
    wal_staking: &mut WalStaking,
    staking: &mut Staking,
    wal_coin: Coin<WAL>,
    validator: ID,
    ctx: &mut TxContext,
): Coin<HAWAL> {
    abort 0
}
