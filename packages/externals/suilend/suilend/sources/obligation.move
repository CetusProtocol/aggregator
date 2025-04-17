module suilend::obligation;

use std::type_name::TypeName;
use sui::balance::Balance;
use sui::clock::Clock;
use suilend::decimal::Decimal;
use suilend::liquidity_mining::UserRewardManager;

// === public structs ===
public struct Obligation<phantom P> has key, store {
    id: UID,
    lending_market_id: ID,
    /// all deposits in the obligation. there is at most one deposit per coin type
    /// There should never be a deposit object with a zeroed amount
    deposits: vector<Deposit>,
    /// all borrows in the obligation. there is at most one deposit per coin type
    /// There should never be a borrow object with a zeroed amount
    borrows: vector<Borrow>,
    /// value of all deposits in USD
    deposited_value_usd: Decimal,
    /// sum(deposit value * open ltv) for all deposits.
    /// if weighted_borrowed_value_usd > allowed_borrow_value_usd,
    /// the obligation is not healthy
    allowed_borrow_value_usd: Decimal,
    /// sum(deposit value * close ltv) for all deposits
    /// if weighted_borrowed_value_usd > unhealthy_borrow_value_usd,
    /// the obligation is unhealthy and can be liquidated
    unhealthy_borrow_value_usd: Decimal,
    super_unhealthy_borrow_value_usd: Decimal, // unused
    /// value of all borrows in USD
    unweighted_borrowed_value_usd: Decimal,
    /// weighted value of all borrows in USD. used when checking if an obligation is liquidatable
    weighted_borrowed_value_usd: Decimal,
    /// weighted value of all borrows in USD, but using the upper bound of the market value
    /// used to limit borrows and withdraws
    weighted_borrowed_value_upper_bound_usd: Decimal,
    borrowing_isolated_asset: bool,
    user_reward_managers: vector<UserRewardManager>,
    /// unused
    bad_debt_usd: Decimal,
    /// unused
    closable: bool,
}

public struct Deposit has store {
    coin_type: TypeName,
    reserve_array_index: u64,
    deposited_ctoken_amount: u64,
    market_value: Decimal,
    user_reward_manager_index: u64,
    /// unused
    attributed_borrow_value: Decimal,
}

public struct Borrow has store {
    coin_type: TypeName,
    reserve_array_index: u64,
    borrowed_amount: Decimal,
    cumulative_borrow_rate: Decimal,
    market_value: Decimal,
    user_reward_manager_index: u64,
}

// hot potato. used by obligation::refresh to indicate that prices are stale.
public struct ExistStaleOracles {}

public struct DepositRecord has copy, drop, store {
    coin_type: TypeName,
    reserve_array_index: u64,
    deposited_ctoken_amount: u64,
    market_value: Decimal,
    user_reward_manager_index: u64,
    /// unused
    attributed_borrow_value: Decimal,
}

public struct BorrowRecord has copy, drop, store {
    coin_type: TypeName,
    reserve_array_index: u64,
    borrowed_amount: Decimal,
    cumulative_borrow_rate: Decimal,
    market_value: Decimal,
    user_reward_manager_index: u64,
}
