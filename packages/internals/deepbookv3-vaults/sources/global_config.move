module deepbookv3_vaults::global_config {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::table::{Self, Table};
    use sui::event::emit;
    use sui::clock::Clock;

    use deepbookv3::{
        balance_manager::{Self, BalanceManager, TradeProof, TradeCap}, 
        pool::Pool, 
        order_info::OrderInfo
    };
    use token::deep::DEEP;

    // === Constants ===
    // package version
    const VERSION: u64 = 1;

    // === Errors ===
    const EInsufficientDeepFee: u64 = 0;
    const ENotAlternativePayment: u64 = 1;
    const EPackageVersionDeprecate: u64 = 2;

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

    public struct InitGlobalConfigEvent has copy, drop {
        admin_cap_id: ID,
        trade_cap_id: ID,
        balance_manager_id: ID,
        global_config_id: ID,
    }

    /// Emit when update package version.
    public struct SetPackageVersion has copy, drop {
        new_version: u64,
        old_version: u64
    }

    public struct SetAdvanceAmount has copy, drop {
        new_amount: u64,
        old_amount: u64
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
                package_version: 0,
            },
            AdminCap {
                id: object::new(ctx),
            }
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
            old_version
        })
    }

    /// Check package version of the package_version in `GlobalConfig` and VERSION in current package.
    public fun checked_package_version(self: &GlobalConfig) {
        assert!(VERSION == self.package_version, EPackageVersionDeprecate);
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
            old_amount
        })
    }

    public fun deposit_deep_fee(self: &mut GlobalConfig, deep_coin: Coin<DEEP>) {
        let deep_balance = coin::into_balance(deep_coin);
        balance::join(&mut self.deep_fee_vault, deep_balance);
    }

    public fun deep_fee_amount(self: &GlobalConfig): u64 {
        balance::value(&self.deep_fee_vault)
    }

    public fun withdraw_deep_fee(_: &AdminCap, self: &mut GlobalConfig, amount: u64, ctx: &mut TxContext): Coin<DEEP> {
        assert!(deep_fee_amount(self) >= amount, EInsufficientDeepFee);

        let deep_fee_balance = balance::split(&mut self.deep_fee_vault, amount);
        coin::from_balance(deep_fee_balance, ctx)
    }

    public fun deposit<T>(
        self: &mut GlobalConfig,
        coin: Coin<T>,
        ctx: &mut TxContext,
    ) {
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

    public(package) fun withdraw_all<T>(
        self: &mut GlobalConfig,
        ctx: &mut TxContext,
    ): Coin<T> {
        self.balance_manager.withdraw_all<T>(ctx)
    }

    public(package) fun deposit_proxy_deep(
        self: &mut GlobalConfig,
        ctx: &mut TxContext,
    ) {
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

    public(package) fun withdraw_advance_deep(self: &mut GlobalConfig, ctx: &mut TxContext): Coin<DEEP> {
        let withdraw_amount = self.alternative_payment_amount;
        assert!(self.deep_fee_amount() >= withdraw_amount, EInsufficientDeepFee);

        let deep_fee_balance = balance::split(&mut self.deep_fee_vault, withdraw_amount);
        coin::from_balance(deep_fee_balance, ctx)
    }

    public(package) fun alternative_payment_deep(self: &mut GlobalConfig, deep_coin: Coin<DEEP>, alt_amount: u64, ctx: &mut TxContext): Coin<DEEP> {
        assert!(is_alternative_payment(self), ENotAlternativePayment);
        let deep_fee_balance_value = balance::value(&self.deep_fee_vault);
        assert!(deep_fee_balance_value >= alt_amount, EInsufficientDeepFee);
        let balance = balance::split(&mut self.deep_fee_vault, alt_amount);
        let mut pure_deep_balance = coin::into_balance(deep_coin);
        balance::join(&mut pure_deep_balance, balance);
        coin::from_balance(pure_deep_balance, ctx)
    }
    
    public(package) fun generate_proof_as_trader(self: &mut GlobalConfig, trade_cap: &TradeCap, ctx: &TxContext): TradeProof {
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
        let trade_proof = deepbookv3::balance_manager::generate_proof_as_trader(&mut self.balance_manager, &self.trade_cap, ctx);

        pool.place_market_order(
            &mut self.balance_manager,
            &trade_proof, 
            client_order_id, 
            self_matching_option,
            quantity,
            is_bid,
            pay_with_deep,
            clock,
            ctx
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
            ctx
        )
    }
}
