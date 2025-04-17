#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_v2::volo;

use std::type_name::{Self, TypeName};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;
use vsui::cert::CERT;
use vsui::native_pool::NativePool;

public struct VoloSwapEvent has copy, drop, store {
    amount_in: u64,
    amount_out: u64,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b(
    pool: &mut NativePool,
    metadata: &mut vsui::cert::Metadata<CERT>,
    sui_system: &mut SuiSystemState,
    coin_input: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<CERT> {
    abort 0
}
