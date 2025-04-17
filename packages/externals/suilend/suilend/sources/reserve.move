/// The reserve module holds the coins of a certain type for a given lending market.
module suilend::reserve;

use pyth::price_identifier::PriceIdentifier;
use pyth::price_info::PriceInfoObject;
use sprungsui::sprungsui::SPRUNGSUI;
use std::type_name::TypeName;
use sui::balance::{Balance, Supply};
use sui::clock::Clock;
use sui::coin::TreasuryCap;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;
use suilend::cell::Cell;
use suilend::decimal::Decimal;
use suilend::liquidity_mining::PoolRewardManager;
use suilend::reserve_config::ReserveConfig;
use suilend::staker::Staker;

// === public structs ===
public struct Reserve<phantom P> has key, store {
    id: UID,
    lending_market_id: ID,
    // array index in lending market's reserve array
    array_index: u64,
    coin_type: TypeName,
    config: Cell<ReserveConfig>,
    mint_decimals: u8,
    // oracles
    price_identifier: PriceIdentifier,
    price: Decimal,
    smoothed_price: Decimal,
    price_last_update_timestamp_s: u64,
    available_amount: u64,
    ctoken_supply: u64,
    borrowed_amount: Decimal,
    cumulative_borrow_rate: Decimal,
    interest_last_update_timestamp_s: u64,
    unclaimed_spread_fees: Decimal,
    /// unused
    attributed_borrow_value: Decimal,
    deposits_pool_reward_manager: PoolRewardManager,
    borrows_pool_reward_manager: PoolRewardManager,
}

/// Interest bearing token on the underlying Coin<T>. The ctoken can be redeemed for
/// the underlying token + any interest earned.
public struct CToken<phantom P, phantom T> has drop {}

/// A request to withdraw liquidity from the reserve. This is a hot potato object.
public struct LiquidityRequest<phantom P, phantom T> {
    amount: u64, // includes fee
    fee: u64,
}

// === Dynamic Field Keys ===
public struct BalanceKey has copy, drop, store {}
public struct StakerKey has copy, drop, store {}

/// Balances are stored in a dynamic field to avoid typing the Reserve with CoinType
public struct Balances<phantom P, phantom T> has store {
    available_amount: Balance<T>,
    ctoken_supply: Supply<CToken<P, T>>,
    fees: Balance<T>,
    ctoken_fees: Balance<CToken<P, T>>,
    deposited_ctokens: Balance<CToken<P, T>>,
}

// === Events ===
public struct InterestUpdateEvent has copy, drop {
    lending_market_id: address,
    coin_type: TypeName,
    reserve_id: address,
    cumulative_borrow_rate: Decimal,
    available_amount: u64,
    borrowed_amount: Decimal,
    unclaimed_spread_fees: Decimal,
    ctoken_supply: u64,
    // data for sui
    borrow_interest_paid: Decimal,
    spread_fee: Decimal,
    supply_interest_earned: Decimal,
    borrow_interest_paid_usd_estimate: Decimal,
    protocol_fee_usd_estimate: Decimal,
    supply_interest_earned_usd_estimate: Decimal,
}

public struct ReserveAssetDataEvent has copy, drop {
    lending_market_id: address,
    coin_type: TypeName,
    reserve_id: address,
    available_amount: Decimal,
    supply_amount: Decimal,
    borrowed_amount: Decimal,
    available_amount_usd_estimate: Decimal,
    supply_amount_usd_estimate: Decimal,
    borrowed_amount_usd_estimate: Decimal,
    borrow_apr: Decimal,
    supply_apr: Decimal,
    ctoken_supply: u64,
    cumulative_borrow_rate: Decimal,
    price: Decimal,
    smoothed_price: Decimal,
    price_last_update_timestamp_s: u64,
}

public struct ClaimStakingRewardsEvent has copy, drop {
    lending_market_id: address,
    coin_type: TypeName,
    reserve_id: address,
    amount: u64,
}
