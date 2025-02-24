#[allow(unused_field)]
module steamm::pool;

use steamm::fees::{Fees, FeeConfig};
use steamm::quote::SwapFee;
use steamm::version::Version;
use sui::balance::{Balance, Supply};

public struct Pool<phantom T0, phantom T1, T2: store, phantom T3: drop> has key, store {
    id: UID,
    quoter: T2,
    balance_a: Balance<T0>,
    balance_b: Balance<T1>,
    lp_supply: Supply<T3>,
    protocol_fees: Fees<T0, T1>,
    pool_fee_config: FeeConfig,
    trading_data: TradingData,
    version: Version,
}

public struct TradingData has store {
    swap_a_in_amount: u128,
    swap_b_out_amount: u128,
    swap_a_out_amount: u128,
    swap_b_in_amount: u128,
    protocol_fees_a: u64,
    protocol_fees_b: u64,
    pool_fees_a: u64,
    pool_fees_b: u64,
}

public struct SwapResult has copy, drop, store {
    user: address,
    pool_id: ID,
    amount_in: u64,
    amount_out: u64,
    output_fees: SwapFee,
    a2b: bool,
    balance_a: u64,
    balance_b: u64,
}
