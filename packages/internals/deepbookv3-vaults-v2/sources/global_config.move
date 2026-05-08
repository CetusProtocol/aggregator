#[allow(unused_const)]
module deepbookv3_vaults_v2::global_config;

use deepbookv3::balance_manager::{
    Self,
    BalanceManager,
    TradeProof,
    TradeCap,
    DepositCap,
    WithdrawCap,
    DeepBookPoolReferral
};
use deepbookv3::order_info::OrderInfo;
use deepbookv3::pool::Pool;
use std::string::{Self, String};
use sui::address;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::dynamic_object_field;
use sui::event::emit;
use sui::table::{Self, Table};
use token::deep::DEEP;

// === Constants ===
// package version
const VERSION: u64 = 1;

const SPONSOR_FEE_RECORD_KEY: vector<u8> = b"sponsor_fee_record";

// === Errors ===
const EInsufficientDeepFee: u64 = 0;
const ENotAlternativePayment: u64 = 1;
const EPackageVersionDeprecate: u64 = 2;
const EOverSponsorLimit: u64 = 3;

// === Structs ===
public struct AdminCap has key, store {
    id: UID,
}

public struct GlobalConfig has key, store {
    id: UID,
    is_alternative_payment: bool,
    alternative_payment_amount: u64,
    trade_cap: TradeCap,
    balance_manager: BalanceManager,
    deep_fee_vault: Balance<DEEP>,
    whitelist: Table<ID, bool>,
    package_version: u64,
}

public struct SponsorFeeRecord has key, store {
    id: UID,
    sponsor_fee_records: Table<String, u64>,
    epoch_sponsor_fee_limit: u64,
    whitelist: Table<address, bool>,
}

public struct InitGlobalConfigEvent has copy, drop {
    admin_cap_id: ID,
    trade_cap_id: ID,
    balance_manager_id: ID,
    global_config_id: ID,
}

public struct BalanceCaps has key, store {
    id: UID,
    deposit_cap: DepositCap,
    withdraw_cap: WithdrawCap,
}

/// Emit when update package version.
public struct SetPackageVersion has copy, drop {
    new_version: u64,
    old_version: u64,
}

public struct SetAdvanceAmount has copy, drop {
    new_amount: u64,
    old_amount: u64,
}

/// Event emitted when referral is set or unset.
public struct SetReferralEvent has copy, drop {
    pool_id: ID,
    is_set: bool,
}

public struct MintBalanceCaps has copy, drop {
    deposit_cap_id: ID,
    withdraw_cap_id: ID,
    balance_manager_id: ID,
}

// === Functions ===
fun init(ctx: &mut TxContext) {
    let mut balance_manager = balance_manager::new(ctx);
    let balance_manager_id = object::id(&balance_manager);
    let trade_cap = balance_manager.mint_trade_cap(ctx);
    let trade_cap_id = object::id(&trade_cap);

    let (global_config, admin_cap) = (
        GlobalConfig {
            id: object::new(ctx),
            is_alternative_payment: true,
            alternative_payment_amount: 100000000,
            trade_cap,
            balance_manager,
            deep_fee_vault: balance::zero<DEEP>(),
            whitelist: table::new<ID, bool>(ctx),
            package_version: 1,
        },
        AdminCap {
            id: object::new(ctx),
        },
    );

    let (global_config_id, admin_cap_id) = (object::id(&global_config), object::id(&admin_cap));

    let sender = tx_context::sender(ctx);
    transfer::transfer(admin_cap, sender);
    transfer::share_object(global_config);

    emit(InitGlobalConfigEvent {
        admin_cap_id,
        trade_cap_id,
        global_config_id,
        balance_manager_id,
    });
}

/// === Public-Mutative Functions ===
/// Update the package version.
public fun update_package_version(_: &AdminCap, config: &mut GlobalConfig, version: u64) {
    let old_version = config.package_version;
    config.package_version = version;

    emit(SetPackageVersion {
        new_version: version,
        old_version,
    })
}

/// Check package version of the package_version in `GlobalConfig` and VERSION in current package.
public fun checked_package_version(self: &GlobalConfig) {
    assert!(VERSION >= self.package_version, EPackageVersionDeprecate);
}

public fun is_alternative_payment(self: &GlobalConfig): bool {
    self.is_alternative_payment
}

public fun set_is_alternative_payment(_: &AdminCap, self: &mut GlobalConfig, advance: bool) {
    self.is_alternative_payment = advance;
}

public fun alternative_payment_amount(self: &GlobalConfig): u64 {
    self.alternative_payment_amount
}

public fun balance_manager_id(self: &GlobalConfig): ID {
    object::id(&self.balance_manager)
}

public fun trade_cap_id(self: &GlobalConfig): ID {
    object::id(&self.trade_cap)
}

public fun set_alternative_payment_amount(_: &AdminCap, self: &mut GlobalConfig, amount: u64) {
    let old_amount = self.alternative_payment_amount;
    self.alternative_payment_amount = amount;
    emit(SetAdvanceAmount {
        new_amount: amount,
        old_amount,
    })
}

public fun deposit_deep_fee(self: &mut GlobalConfig, deep_coin: Coin<DEEP>) {
    let deep_balance = coin::into_balance(deep_coin);
    balance::join(&mut self.deep_fee_vault, deep_balance);
}

public fun deep_fee_amount(self: &GlobalConfig): u64 {
    balance::value(&self.deep_fee_vault)
}

public fun withdraw_deep_fee(
    _: &AdminCap,
    self: &mut GlobalConfig,
    amount: u64,
    ctx: &mut TxContext,
): Coin<DEEP> {
    assert!(deep_fee_amount(self) >= amount, EInsufficientDeepFee);

    let deep_fee_balance = balance::split(&mut self.deep_fee_vault, amount);
    coin::from_balance(deep_fee_balance, ctx)
}

public fun deposit<T>(self: &mut GlobalConfig, coin: Coin<T>, ctx: &mut TxContext) {
    self.balance_manager.deposit(coin, ctx);
}

public fun add_whitelist(_: &AdminCap, self: &mut GlobalConfig, pool_id: ID, is_whitelisted: bool) {
    table::add(&mut self.whitelist, pool_id, is_whitelisted);
}

public fun remove_whitelist(_: &AdminCap, self: &mut GlobalConfig, pool_id: ID) {
    if (!is_whitelisted(self, pool_id)) return;
    table::remove(&mut self.whitelist, pool_id);
}

public fun is_whitelisted(self: &GlobalConfig, pool_id: ID): bool {
    table::contains(&self.whitelist, pool_id)
}

public(package) fun withdraw<T>(
    self: &mut GlobalConfig,
    withdraw_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    self.balance_manager.withdraw(withdraw_amount, ctx)
}

public(package) fun withdraw_all<T>(self: &mut GlobalConfig, ctx: &mut TxContext): Coin<T> {
    self.balance_manager.withdraw_all<T>(ctx)
}

public(package) fun deposit_proxy_deep(self: &mut GlobalConfig, ctx: &mut TxContext) {
    let deep_coin = self.withdraw_advance_deep(ctx);
    self.deposit(deep_coin, ctx);
}

public(package) fun withdraw_refund_deep(
    self: &mut GlobalConfig,
    refund_amount: u64,
    ctx: &mut TxContext,
): Coin<DEEP> {
    self.balance_manager.withdraw<DEEP>(refund_amount, ctx)
}

public(package) fun withdraw_advance_deep(
    self: &mut GlobalConfig,
    ctx: &mut TxContext,
): Coin<DEEP> {
    let withdraw_amount = self.alternative_payment_amount;
    assert!(self.deep_fee_amount() >= withdraw_amount, EInsufficientDeepFee);

    let deep_fee_balance = balance::split(&mut self.deep_fee_vault, withdraw_amount);
    coin::from_balance(deep_fee_balance, ctx)
}

// This method will return the deep coin after deducting the sponsor fee.
// If the vault will not pay the sponsor fee, it will return the deep coin.
// If the vault will pay the sponsor fee, it will deduct the sponsor fee from the deep coin.
public(package) fun alternative_payment_deep(
    self: &mut GlobalConfig,
    deep_coin: Coin<DEEP>,
    alt_amount: u64,
    ctx: &mut TxContext,
): Coin<DEEP> {
    if (!is_alternative_payment(self)) {
        return deep_coin
    };

    let is_pay_sponsor_fee = add_sponsor_record_v2(self, alt_amount, ctx);
    if (!is_pay_sponsor_fee || balance::value(&self.deep_fee_vault) < alt_amount) {
        return deep_coin
    };

    let balance = balance::split(&mut self.deep_fee_vault, alt_amount);
    let mut pure_deep_balance = coin::into_balance(deep_coin);
    balance::join(&mut pure_deep_balance, balance);
    coin::from_balance(pure_deep_balance, ctx)
}

public(package) fun generate_proof_as_trader(
    self: &mut GlobalConfig,
    trade_cap: &TradeCap,
    ctx: &TxContext,
): TradeProof {
    self.balance_manager.generate_proof_as_trader(trade_cap, ctx)
}

public(package) fun place_market_order_by_trader<BaseAsset, QuoteAsset>(
    self: &mut GlobalConfig,
    pool: &mut Pool<BaseAsset, QuoteAsset>,
    client_order_id: u64,
    self_matching_option: u8,
    quantity: u64,
    is_bid: bool,
    pay_with_deep: bool,
    clock: &Clock,
    ctx: &TxContext,
): OrderInfo {
    let trade_proof = deepbookv3::balance_manager::generate_proof_as_trader(
        &mut self.balance_manager,
        &self.trade_cap,
        ctx,
    );

    pool.place_market_order(
        &mut self.balance_manager,
        &trade_proof,
        client_order_id,
        self_matching_option,
        quantity,
        is_bid,
        pay_with_deep,
        clock,
        ctx,
    )
}

public(package) fun place_market_order_by_user_bm<BaseAsset, QuoteAsset>(
    balance_manager: &mut BalanceManager,
    pool: &mut Pool<BaseAsset, QuoteAsset>,
    client_order_id: u64,
    self_matching_option: u8,
    quantity: u64,
    is_bid: bool,
    pay_with_deep: bool,
    clock: &Clock,
    ctx: &TxContext,
): OrderInfo {
    let trade_proof = balance_manager.generate_proof_as_owner(ctx);

    pool.place_market_order(
        balance_manager,
        &trade_proof,
        client_order_id,
        self_matching_option,
        quantity,
        is_bid,
        pay_with_deep,
        clock,
        ctx,
    )
}

public(package) fun add_sponsor_record(self: &mut GlobalConfig, sponsor_fee: u64, ctx: &TxContext) {
    let key = user_sponsor_key(ctx);

    let sponsor_fee_records = dynamic_object_field::borrow_mut<String, SponsorFeeRecord>(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
    );

    if (!table::contains(&sponsor_fee_records.whitelist, ctx.sender())) {
        assert!(sponsor_fee <= sponsor_fee_records.epoch_sponsor_fee_limit, EOverSponsorLimit);
    };

    if (!table::contains(&sponsor_fee_records.sponsor_fee_records, key)) {
        table::add(&mut sponsor_fee_records.sponsor_fee_records, key, sponsor_fee);
    } else {
        let old_sponsor_fee = table::borrow_mut(
            &mut sponsor_fee_records.sponsor_fee_records,
            key,
        );
        if (!table::contains(&sponsor_fee_records.whitelist, ctx.sender())) {
            assert!(
                *old_sponsor_fee + sponsor_fee <= sponsor_fee_records.epoch_sponsor_fee_limit,
                EOverSponsorLimit,
            );
        };
        *old_sponsor_fee = *old_sponsor_fee + sponsor_fee;
    }
}

// This method will return bool value to indicate if the vault will pay the sponsor fee.
// If the vault will pay the sponsor fee, it will return true, otherwise it will return false.
// If the vault will pay the sponsor fee, it will add the sponsor fee to the sponsor fee record.
// If the vault will not pay the sponsor fee, it will not add the sponsor fee to the sponsor fee record.
public(package) fun add_sponsor_record_v2(
    self: &mut GlobalConfig,
    sponsor_fee: u64,
    ctx: &TxContext,
): bool {
    let key = user_sponsor_key(ctx);

    let sponsor_fee_records = dynamic_object_field::borrow_mut<String, SponsorFeeRecord>(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
    );

    if (!table::contains(&sponsor_fee_records.whitelist, ctx.sender())) {
        // assert!(sponsor_fee <= sponsor_fee_records.epoch_sponsor_fee_limit, EOverSponsorLimit);
        if (sponsor_fee > sponsor_fee_records.epoch_sponsor_fee_limit) {
            return false
        }
    };

    if (!table::contains(&sponsor_fee_records.sponsor_fee_records, key)) {
        table::add(&mut sponsor_fee_records.sponsor_fee_records, key, sponsor_fee);
    } else {
        let old_sponsor_fee = table::borrow_mut(
            &mut sponsor_fee_records.sponsor_fee_records,
            key,
        );
        if (!table::contains(&sponsor_fee_records.whitelist, ctx.sender())) {
            // assert!(
            //     *old_sponsor_fee + sponsor_fee <= sponsor_fee_records.epoch_sponsor_fee_limit,
            //     EOverSponsorLimit,
            // );
            if (*old_sponsor_fee + sponsor_fee > sponsor_fee_records.epoch_sponsor_fee_limit) {
                return false
            }
        };
        *old_sponsor_fee = *old_sponsor_fee + sponsor_fee;
    };
    true
}

public entry fun init_sponsor_fee_record(self: &mut GlobalConfig, ctx: &mut TxContext) {
    let record = SponsorFeeRecord {
        id: object::new(ctx),
        sponsor_fee_records: table::new<String, u64>(ctx),
        epoch_sponsor_fee_limit: 10000000000,
        whitelist: table::new<address, bool>(ctx),
    };

    dynamic_object_field::add(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
        record,
    );
}

public fun update_sponsor_fee_limit(self: &mut GlobalConfig, _: &AdminCap, limit: u64) {
    let record = dynamic_object_field::borrow_mut<String, SponsorFeeRecord>(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
    );
    record.epoch_sponsor_fee_limit = limit;
}

public fun add_sponsor_whitelist_address(self: &mut GlobalConfig, _: &AdminCap, address: address) {
    let record = dynamic_object_field::borrow_mut<String, SponsorFeeRecord>(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
    );
    if (!table::contains(&record.whitelist, address)) {
        table::add(&mut record.whitelist, address, true);
    }
}

public fun remove_sponsor_whitelist_address(
    self: &mut GlobalConfig,
    _: &AdminCap,
    address: address,
) {
    let record = dynamic_object_field::borrow_mut<String, SponsorFeeRecord>(
        &mut self.id,
        string::utf8(SPONSOR_FEE_RECORD_KEY),
    );
    if (table::contains(&record.whitelist, address)) {
        table::remove(&mut record.whitelist, address);
    }
}

fun user_sponsor_key(ctx: &TxContext): String {
    let epoch = u64_to_str(ctx.epoch());
    let mut key = address::to_string(ctx.sender());
    string::append_utf8(&mut key, b"-");
    string::append(&mut key, epoch);
    key
}

/// Convert u64 to String.
fun u64_to_str(num: u64): String {
    let mut num = num;
    if (num == 0) {
        return string::utf8(b"0")
    };
    let mut digits = vector::empty<u8>();
    while (num > 0) {
        let remainder = (num % 10) as u8;
        num = num / 10;
        vector::push_back(&mut digits, remainder + 48);
    };
    vector::reverse(&mut digits);
    string::utf8(digits)
}

// === Referral Management Functions ===

/// Set referral for a specific pool on user's BalanceManager.
/// Once set, all swaps through the BalanceManager will use the referral.
public fun set_referral(
    _: &AdminCap,
    global_config: &mut GlobalConfig,
    referral_cap: &DeepBookPoolReferral,
    pool_id: ID,
) {
    let balance_manager = &mut global_config.balance_manager;
    let trade_cap = &global_config.trade_cap;
    balance_manager.set_balance_manager_referral(referral_cap, trade_cap);
    emit(SetReferralEvent { pool_id, is_set: true });
}

/// Unset referral for a specific pool on user's BalanceManager.
public fun unset_referral<BaseAsset, QuoteAsset>(
    _: &AdminCap,
    global_config: &mut GlobalConfig,
    pool: &Pool<BaseAsset, QuoteAsset>,
) {
    let balance_manager = &mut global_config.balance_manager;
    let trade_cap = &global_config.trade_cap;
    balance_manager.unset_balance_manager_referral(pool.id(), trade_cap);
    emit(SetReferralEvent { pool_id: pool.id(), is_set: false });
}

public(package) fun get_mut_config_balance_manager(self: &mut GlobalConfig): &mut BalanceManager {
    &mut self.balance_manager
}

public(package) fun get_config_trade_cap(self: &GlobalConfig): &TradeCap {
    &self.trade_cap
}

public(package) fun get_mut_balance_manager_and_trade_cap(
    self: &mut GlobalConfig,
): (&mut BalanceManager, &TradeCap) {
    (&mut self.balance_manager, &self.trade_cap)
}

public fun mint_balance_caps(_: &AdminCap, self: &mut GlobalConfig, ctx: &mut TxContext) {
    let (bm, _) = self.get_mut_balance_manager_and_trade_cap();
    let deposit_cap = bm.mint_deposit_cap(ctx);
    let withdraw_cap = bm.mint_withdraw_cap(ctx);
    let balance_caps = BalanceCaps {
        id: object::new(ctx),
        deposit_cap,
        withdraw_cap,
    };
    emit(MintBalanceCaps {
        deposit_cap_id: object::id(&balance_caps.deposit_cap),
        withdraw_cap_id: object::id(&balance_caps.withdraw_cap),
        balance_manager_id: object::id(&self.balance_manager),
    });

    transfer::share_object(balance_caps);
}

public(package) fun get_deposit_and_withdraw_caps(
    balance_caps: &BalanceCaps,
): (&DepositCap, &WithdrawCap) {
    (&balance_caps.deposit_cap, &balance_caps.withdraw_cap)
}
