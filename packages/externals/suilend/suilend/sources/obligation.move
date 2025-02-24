module suilend::obligation {
    use std::type_name::{Self, TypeName};
    use sui::balance::Balance;
    use sui::clock::Clock;
    use sui::event;
    use suilend::decimal::{
        Self,
        Decimal,
        mul,
        add,
        sub,
        div,
        gt,
        lt,
        min,
        floor,
        le,
        eq,
        saturating_sub
    };
    use suilend::liquidity_mining::{Self, UserRewardManager, PoolRewardManager};
    use suilend::reserve::{Self, Reserve, config};
    use suilend::reserve_config::{
        open_ltv,
        close_ltv,
        borrow_weight,
        liquidation_bonus,
        protocol_liquidation_fee,
        isolated
    };

    // === Errors ===
    const EObligationIsNotLiquidatable: u64 = 0;
    const EObligationIsNotHealthy: u64 = 1;
    const EBorrowNotFound: u64 = 2;
    const EDepositNotFound: u64 = 3;
    const EIsolatedAssetViolation: u64 = 4;
    const ETooManyDeposits: u64 = 5;
    const ETooManyBorrows: u64 = 6;
    const EObligationIsNotForgivable: u64 = 7;
    const ECannotDepositAndBorrowSameAsset: u64 = 8;
    const EOraclesAreStale: u64 = 9;

    // === Constants ===
    const CLOSE_FACTOR_PCT: u8 = 20;
    const MAX_DEPOSITS: u64 = 5;
    const MAX_BORROWS: u64 = 5;

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

    // === Events ===
    public struct ObligationDataEvent has copy, drop {
        lending_market_id: address,
        obligation_id: address,
        deposits: vector<DepositRecord>,
        borrows: vector<BorrowRecord>,
        deposited_value_usd: Decimal,
        allowed_borrow_value_usd: Decimal,
        unhealthy_borrow_value_usd: Decimal,
        super_unhealthy_borrow_value_usd: Decimal, // unused
        unweighted_borrowed_value_usd: Decimal,
        weighted_borrowed_value_usd: Decimal,
        weighted_borrowed_value_upper_bound_usd: Decimal,
        borrowing_isolated_asset: bool,
        bad_debt_usd: Decimal,
        closable: bool,
    }

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

    // === Public-Friend Functions
    public(package) fun create_obligation<P>(
        lending_market_id: ID,
        ctx: &mut TxContext,
    ): Obligation<P> {
        Obligation<P> {
            id: object::new(ctx),
            lending_market_id,
            deposits: vector::empty(),
            borrows: vector::empty(),
            deposited_value_usd: decimal::from(0),
            unweighted_borrowed_value_usd: decimal::from(0),
            weighted_borrowed_value_usd: decimal::from(0),
            weighted_borrowed_value_upper_bound_usd: decimal::from(0),
            allowed_borrow_value_usd: decimal::from(0),
            unhealthy_borrow_value_usd: decimal::from(0),
            super_unhealthy_borrow_value_usd: decimal::from(0),
            borrowing_isolated_asset: false,
            user_reward_managers: vector::empty(),
            bad_debt_usd: decimal::from(0),
            closable: false,
        }
    }

    /// update the obligation's borrowed amounts and health values. this is
    /// called by the lending market prior to any borrow, withdraw, or liquidate operation.
    public(package) fun refresh<P>(
        obligation: &mut Obligation<P>,
        reserves: &mut vector<Reserve<P>>,
        clock: &Clock,
    ): Option<ExistStaleOracles> {
        let mut exist_stale_oracles = false;

        let mut i = 0;
        let mut deposited_value_usd = decimal::from(0);
        let mut allowed_borrow_value_usd = decimal::from(0);
        let mut unhealthy_borrow_value_usd = decimal::from(0);

        while (i < vector::length(&obligation.deposits)) {
            let deposit = vector::borrow_mut(&mut obligation.deposits, i);

            let deposit_reserve = vector::borrow_mut(reserves, deposit.reserve_array_index);

            reserve::compound_interest(deposit_reserve, clock);

            if (!reserve::is_price_fresh(deposit_reserve, clock)) {
                exist_stale_oracles = true;
            };

            let market_value = reserve::ctoken_market_value(
                deposit_reserve,
                deposit.deposited_ctoken_amount,
            );
            let market_value_lower_bound = reserve::ctoken_market_value_lower_bound(
                deposit_reserve,
                deposit.deposited_ctoken_amount,
            );

            deposit.market_value = market_value;
            deposited_value_usd = add(deposited_value_usd, market_value);
            allowed_borrow_value_usd =
                add(
                    allowed_borrow_value_usd,
                    mul(
                        market_value_lower_bound,
                        open_ltv(config(deposit_reserve)),
                    ),
                );
            unhealthy_borrow_value_usd =
                add(
                    unhealthy_borrow_value_usd,
                    mul(
                        market_value,
                        close_ltv(config(deposit_reserve)),
                    ),
                );

            i = i + 1;
        };

        obligation.deposited_value_usd = deposited_value_usd;
        obligation.allowed_borrow_value_usd = allowed_borrow_value_usd;
        obligation.unhealthy_borrow_value_usd = unhealthy_borrow_value_usd;

        let mut i = 0;
        let mut unweighted_borrowed_value_usd = decimal::from(0);
        let mut weighted_borrowed_value_usd = decimal::from(0);
        let mut weighted_borrowed_value_upper_bound_usd = decimal::from(0);
        let mut borrowing_isolated_asset = false;

        while (i < vector::length(&obligation.borrows)) {
            let borrow = vector::borrow_mut(&mut obligation.borrows, i);

            let borrow_reserve = vector::borrow_mut(reserves, borrow.reserve_array_index);
            reserve::compound_interest(borrow_reserve, clock);
            if (!reserve::is_price_fresh(borrow_reserve, clock)) {
                exist_stale_oracles = true;
            };

            compound_debt(borrow, borrow_reserve);

            let market_value = reserve::market_value(borrow_reserve, borrow.borrowed_amount);
            let market_value_upper_bound = reserve::market_value_upper_bound(
                borrow_reserve,
                borrow.borrowed_amount,
            );

            borrow.market_value = market_value;
            unweighted_borrowed_value_usd = add(unweighted_borrowed_value_usd, market_value);
            weighted_borrowed_value_usd =
                add(
                    weighted_borrowed_value_usd,
                    mul(
                        market_value,
                        borrow_weight(config(borrow_reserve)),
                    ),
                );
            weighted_borrowed_value_upper_bound_usd =
                add(
                    weighted_borrowed_value_upper_bound_usd,
                    mul(
                        market_value_upper_bound,
                        borrow_weight(config(borrow_reserve)),
                    ),
                );

            if (isolated(config(borrow_reserve))) {
                borrowing_isolated_asset = true;
            };

            i = i + 1;
        };

        obligation.unweighted_borrowed_value_usd = unweighted_borrowed_value_usd;
        obligation.weighted_borrowed_value_usd = weighted_borrowed_value_usd;
        obligation.weighted_borrowed_value_upper_bound_usd =
            weighted_borrowed_value_upper_bound_usd;

        obligation.borrowing_isolated_asset = borrowing_isolated_asset;

        if (exist_stale_oracles) {
            return option::some(ExistStaleOracles {})
        };

        option::none()
    }

    /// Process a deposit action
    public(package) fun deposit<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        ctoken_amount: u64,
    ) {
        let deposit_index = find_or_add_deposit(obligation, reserve, clock);
        assert!(vector::length(&obligation.deposits) <= MAX_DEPOSITS, ETooManyDeposits);

        let borrow_index = find_borrow_index(obligation, reserve);
        assert!(
            borrow_index == vector::length(&obligation.borrows),
            ECannotDepositAndBorrowSameAsset,
        );

        let deposit = vector::borrow_mut(&mut obligation.deposits, deposit_index);

        deposit.deposited_ctoken_amount = deposit.deposited_ctoken_amount + ctoken_amount;

        let deposit_value = reserve::ctoken_market_value(reserve, ctoken_amount);

        // update other health values. note that we don't enforce price freshness here. this is purely
        // to make offchain accounting easier. any operation that requires price
        // freshness (withdraw, borrow, liquidate) will refresh the obligation right before.
        deposit.market_value = add(deposit.market_value, deposit_value);
        obligation.deposited_value_usd = add(obligation.deposited_value_usd, deposit_value);
        obligation.allowed_borrow_value_usd =
            add(
                obligation.allowed_borrow_value_usd,
                mul(
                    reserve::ctoken_market_value_lower_bound(reserve, ctoken_amount),
                    open_ltv(config(reserve)),
                ),
            );
        obligation.unhealthy_borrow_value_usd =
            add(
                obligation.unhealthy_borrow_value_usd,
                mul(
                    deposit_value,
                    close_ltv(config(reserve)),
                ),
            );

        let user_reward_manager = vector::borrow_mut(
            &mut obligation.user_reward_managers,
            deposit.user_reward_manager_index,
        );
        liquidity_mining::change_user_reward_manager_share(
            reserve::deposits_pool_reward_manager_mut(reserve),
            user_reward_manager,
            deposit.deposited_ctoken_amount,
            clock,
        );
        log_obligation_data(obligation);
    }

    /// Process a borrow action. Makes sure that the obligation is healthy after the borrow.
    public(package) fun borrow<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        amount: u64,
    ) {
        let borrow_index = find_or_add_borrow(obligation, reserve, clock);
        assert!(vector::length(&obligation.borrows) <= MAX_BORROWS, ETooManyBorrows);

        let deposit_index = find_deposit_index(obligation, reserve);
        assert!(
            deposit_index == vector::length(&obligation.deposits),
            ECannotDepositAndBorrowSameAsset,
        );

        let borrow = vector::borrow_mut(&mut obligation.borrows, borrow_index);
        borrow.borrowed_amount = add(borrow.borrowed_amount, decimal::from(amount));

        // update health values
        let borrow_market_value = reserve::market_value(reserve, decimal::from(amount));
        let borrow_market_value_upper_bound = reserve::market_value_upper_bound(
            reserve,
            decimal::from(amount),
        );

        borrow.market_value = add(borrow.market_value, borrow_market_value);
        obligation.unweighted_borrowed_value_usd =
            add(
                obligation.unweighted_borrowed_value_usd,
                borrow_market_value,
            );
        obligation.weighted_borrowed_value_usd =
            add(
                obligation.weighted_borrowed_value_usd,
                mul(borrow_market_value, borrow_weight(config(reserve))),
            );
        obligation.weighted_borrowed_value_upper_bound_usd =
            add(
                obligation.weighted_borrowed_value_upper_bound_usd,
                mul(borrow_market_value_upper_bound, borrow_weight(config(reserve))),
            );

        let user_reward_manager = vector::borrow_mut(
            &mut obligation.user_reward_managers,
            borrow.user_reward_manager_index,
        );
        liquidity_mining::change_user_reward_manager_share(
            reserve::borrows_pool_reward_manager_mut(reserve),
            user_reward_manager,
            liability_shares(borrow),
            clock,
        );

        assert!(is_healthy(obligation), EObligationIsNotHealthy);

        if (isolated(config(reserve)) || obligation.borrowing_isolated_asset) {
            assert!(vector::length(&obligation.borrows) == 1, EIsolatedAssetViolation);
        };
        log_obligation_data(obligation);
    }

    /// Process a repay action. The reserve's interest must have been refreshed before calling this.
    public(package) fun repay<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        max_repay_amount: Decimal,
    ): Decimal {
        let borrow_index = find_borrow_index(obligation, reserve);
        assert!(borrow_index < vector::length(&obligation.borrows), EBorrowNotFound);
        let borrow = vector::borrow_mut(&mut obligation.borrows, borrow_index);

        let old_borrow_amount = borrow.borrowed_amount;
        compound_debt(borrow, reserve);

        let repay_amount = min(max_repay_amount, borrow.borrowed_amount);

        let interest_diff = sub(borrow.borrowed_amount, old_borrow_amount);

        borrow.borrowed_amount = sub(borrow.borrowed_amount, repay_amount);

        // update other health values. note that we don't enforce price freshness here. this is purely
        // to make offchain accounting easier. any operation that requires price
        // freshness (withdraw, borrow, liquidate) will refresh the obligation right before.
        if (le(interest_diff, repay_amount)) {
            let diff = saturating_sub(repay_amount, interest_diff);
            let repay_value = reserve::market_value(reserve, diff);
            let repay_value_upper_bound = reserve::market_value_upper_bound(reserve, diff);

            borrow.market_value = saturating_sub(borrow.market_value, repay_value);
            obligation.unweighted_borrowed_value_usd =
                saturating_sub(
                    obligation.unweighted_borrowed_value_usd,
                    repay_value,
                );
            obligation.weighted_borrowed_value_usd =
                saturating_sub(
                    obligation.weighted_borrowed_value_usd,
                    mul(repay_value, borrow_weight(config(reserve))),
                );
            obligation.weighted_borrowed_value_upper_bound_usd =
                saturating_sub(
                    obligation.weighted_borrowed_value_upper_bound_usd,
                    mul(repay_value_upper_bound, borrow_weight(config(reserve))),
                );
        } else {
            let additional_borrow_amount = saturating_sub(interest_diff, repay_amount);
            let additional_borrow_value = reserve::market_value(reserve, additional_borrow_amount);
            let additional_borrow_value_upper_bound = reserve::market_value_upper_bound(
                reserve,
                additional_borrow_amount,
            );

            borrow.market_value = add(borrow.market_value, additional_borrow_value);
            obligation.unweighted_borrowed_value_usd =
                add(
                    obligation.unweighted_borrowed_value_usd,
                    additional_borrow_value,
                );
            obligation.weighted_borrowed_value_usd =
                add(
                    obligation.weighted_borrowed_value_usd,
                    mul(additional_borrow_value, borrow_weight(config(reserve))),
                );
            obligation.weighted_borrowed_value_upper_bound_usd =
                add(
                    obligation.weighted_borrowed_value_upper_bound_usd,
                    mul(additional_borrow_value_upper_bound, borrow_weight(config(reserve))),
                );
        };

        let user_reward_manager = vector::borrow_mut(
            &mut obligation.user_reward_managers,
            borrow.user_reward_manager_index,
        );
        liquidity_mining::change_user_reward_manager_share(
            reserve::borrows_pool_reward_manager_mut(reserve),
            user_reward_manager,
            liability_shares(borrow),
            clock,
        );

        if (eq(borrow.borrowed_amount, decimal::from(0))) {
            let Borrow {
                coin_type: _,
                reserve_array_index: _,
                borrowed_amount: _,
                cumulative_borrow_rate: _,
                market_value: _,
                user_reward_manager_index: _,
            } = vector::remove(&mut obligation.borrows, borrow_index);
        };

        log_obligation_data(obligation);
        repay_amount
    }

    /// Process a withdraw action. Makes sure that the obligation is healthy after the withdraw.
    public(package) fun withdraw<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        ctoken_amount: u64,
        stale_oracles: Option<ExistStaleOracles>,
    ) {
        if (stale_oracles.is_some() && vector::is_empty(&obligation.borrows)) {
            let ExistStaleOracles {} = option::destroy_some(stale_oracles);
        } else {
            assert_no_stale_oracles(stale_oracles);
        };

        withdraw_unchecked(obligation, reserve, clock, ctoken_amount);

        assert!(is_healthy(obligation), EObligationIsNotHealthy);
        log_obligation_data(obligation);
    }

    /// Process a liquidate action.
    /// Returns the amount of ctokens to withdraw, and the amount of tokens to repay.
    public(package) fun liquidate<P>(
        obligation: &mut Obligation<P>,
        reserves: &mut vector<Reserve<P>>,
        repay_reserve_array_index: u64,
        withdraw_reserve_array_index: u64,
        clock: &Clock,
        repay_amount: u64,
    ): (u64, Decimal) {
        assert!(is_liquidatable(obligation), EObligationIsNotLiquidatable);

        let repay_reserve = vector::borrow(reserves, repay_reserve_array_index);
        let withdraw_reserve = vector::borrow(reserves, withdraw_reserve_array_index);
        let borrow = find_borrow(obligation, repay_reserve);
        let deposit = find_deposit(obligation, withdraw_reserve);

        // invariant: repay_amount <= borrow.borrowed_amount
        let repay_amount = if (le(borrow.market_value, decimal::from(1))) {
            // full liquidation
            min(
                borrow.borrowed_amount,
                decimal::from(repay_amount),
            )
        } else {
            // partial liquidation
            let max_repay_value = min(
                mul(
                    obligation.weighted_borrowed_value_usd,
                    decimal::from_percent(CLOSE_FACTOR_PCT),
                ),
                borrow.market_value,
            );

            // <= 1
            let max_repay_pct = div(max_repay_value, borrow.market_value);
            min(
                mul(max_repay_pct, borrow.borrowed_amount),
                decimal::from(repay_amount),
            )
        };

        let repay_value = reserve::market_value(repay_reserve, repay_amount);
        let bonus = add(
            liquidation_bonus(config(withdraw_reserve)),
            protocol_liquidation_fee(config(withdraw_reserve)),
        );

        let withdraw_value = mul(
            repay_value,
            add(decimal::from(1), bonus),
        );

        // repay amount, but in decimals. called settle amount to keep logic in line with
        // spl-lending
        let final_settle_amount;
        let final_withdraw_amount;

        if (lt(deposit.market_value, withdraw_value)) {
            let repay_pct = div(deposit.market_value, withdraw_value);

            final_settle_amount = mul(repay_amount, repay_pct);
            final_withdraw_amount = deposit.deposited_ctoken_amount;
        } else {
            let withdraw_pct = div(withdraw_value, deposit.market_value);

            final_settle_amount = repay_amount;
            final_withdraw_amount =
                floor(
                    mul(decimal::from(deposit.deposited_ctoken_amount), withdraw_pct),
                );
        };

        repay(
            obligation,
            vector::borrow_mut(reserves, repay_reserve_array_index),
            clock,
            final_settle_amount,
        );
        withdraw_unchecked(
            obligation,
            vector::borrow_mut(reserves, withdraw_reserve_array_index),
            clock,
            final_withdraw_amount,
        );

        log_obligation_data(obligation);
        (final_withdraw_amount, final_settle_amount)
    }

    public(package) fun forgive<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        max_forgive_amount: Decimal,
    ): Decimal {
        assert!(is_forgivable(obligation), EObligationIsNotForgivable);
        // not logging here because it logs inside repay instead
        repay<P>(
            obligation,
            reserve,
            clock,
            max_forgive_amount,
        )
    }

    public(package) fun claim_rewards<P, T>(
        obligation: &mut Obligation<P>,
        pool_reward_manager: &mut PoolRewardManager,
        clock: &Clock,
        reward_index: u64,
    ): Balance<T> {
        let user_reward_manager_index = find_user_reward_manager_index(
            obligation,
            pool_reward_manager,
        );
        let user_reward_manager = vector::borrow_mut(
            &mut obligation.user_reward_managers,
            user_reward_manager_index,
        );

        liquidity_mining::claim_rewards<T>(
            pool_reward_manager,
            user_reward_manager,
            clock,
            reward_index,
        )
    }

    // === Public-View Functions
    public fun deposits<P>(obligation: &Obligation<P>): &vector<Deposit> {
        &obligation.deposits
    }

    public fun borrows<P>(obligation: &Obligation<P>): &vector<Borrow> {
        &obligation.borrows
    }

    public fun deposited_value_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.deposited_value_usd
    }

    public fun allowed_borrow_value_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.allowed_borrow_value_usd
    }

    public fun unhealthy_borrow_value_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.unhealthy_borrow_value_usd
    }

    public fun unweighted_borrowed_value_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.unweighted_borrowed_value_usd
    }

    public fun weighted_borrowed_value_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.weighted_borrowed_value_usd
    }

    public fun weighted_borrowed_value_upper_bound_usd<P>(obligation: &Obligation<P>): Decimal {
        obligation.weighted_borrowed_value_upper_bound_usd
    }

    public fun borrowing_isolated_asset<P>(obligation: &Obligation<P>): bool {
        obligation.borrowing_isolated_asset
    }

    public fun user_reward_managers<P>(obligation: &Obligation<P>): &vector<UserRewardManager> {
        &obligation.user_reward_managers
    }

    public use fun deposit_coin_type as Deposit.coin_type;

    public fun deposit_coin_type(deposit: &Deposit): TypeName {
        deposit.coin_type
    }

    public use fun deposit_reserve_array_index as Deposit.reserve_array_index;

    public fun deposit_reserve_array_index(deposit: &Deposit): u64 {
        deposit.reserve_array_index
    }

    public use fun deposit_deposited_ctoken_amount as Deposit.deposited_ctoken_amount;

    public fun deposit_deposited_ctoken_amount(deposit: &Deposit): u64 {
        deposit.deposited_ctoken_amount
    }

    public use fun deposit_market_value as Deposit.market_value;

    public fun deposit_market_value(deposit: &Deposit): Decimal {
        deposit.market_value
    }

    public use fun deposit_user_reward_manager_index as Deposit.user_reward_manager_index;

    public fun deposit_user_reward_manager_index(deposit: &Deposit): u64 {
        deposit.user_reward_manager_index
    }

    public use fun borrow_coin_type as Borrow.coin_type;

    public fun borrow_coin_type(borrow: &Borrow): TypeName {
        borrow.coin_type
    }

    public use fun borrow_reserve_array_index as Borrow.reserve_array_index;

    public fun borrow_reserve_array_index(borrow: &Borrow): u64 {
        borrow.reserve_array_index
    }

    public use fun borrow_borrowed_amount as Borrow.borrowed_amount;

    public fun borrow_borrowed_amount(borrow: &Borrow): Decimal {
        borrow.borrowed_amount
    }

    public use fun borrow_cumulative_borrow_rate as Borrow.cumulative_borrow_rate;

    public fun borrow_cumulative_borrow_rate(borrow: &Borrow): Decimal {
        borrow.cumulative_borrow_rate
    }

    public use fun borrow_market_value as Borrow.market_value;

    public fun borrow_market_value(borrow: &Borrow): Decimal {
        borrow.market_value
    }

    public use fun borrow_user_reward_manager_index as Borrow.user_reward_manager_index;

    public fun borrow_user_reward_manager_index(borrow: &Borrow): u64 {
        borrow.user_reward_manager_index
    }

    public fun deposited_ctoken_amount<P, T>(obligation: &Obligation<P>): u64 {
        let mut i = 0;
        while (i < vector::length(&obligation.deposits)) {
            let deposit = vector::borrow(&obligation.deposits, i);
            if (deposit.coin_type == type_name::get<T>()) {
                return deposit.deposited_ctoken_amount
            };

            i = i + 1;
        };

        0
    }

    public fun borrowed_amount<P, T>(obligation: &Obligation<P>): Decimal {
        let mut i = 0;
        while (i < vector::length(&obligation.borrows)) {
            let borrow = vector::borrow(&obligation.borrows, i);
            if (borrow.coin_type == type_name::get<T>()) {
                return borrow.borrowed_amount
            };

            i = i + 1;
        };

        decimal::from(0)
    }

    public fun is_healthy<P>(obligation: &Obligation<P>): bool {
        le(obligation.weighted_borrowed_value_upper_bound_usd, obligation.allowed_borrow_value_usd)
    }

    public fun is_liquidatable<P>(obligation: &Obligation<P>): bool {
        gt(obligation.weighted_borrowed_value_usd, obligation.unhealthy_borrow_value_usd)
    }

    public fun is_forgivable<P>(obligation: &Obligation<P>): bool {
        vector::length(&obligation.deposits) == 0
    }

    // calculate the maximum amount that can be borrowed within an obligation
    public(package) fun max_borrow_amount<P>(
        obligation: &Obligation<P>,
        reserve: &Reserve<P>,
    ): u64 {
        floor(
            reserve::usd_to_token_amount_lower_bound(
                reserve,
                div(
                    saturating_sub(
                        obligation.allowed_borrow_value_usd,
                        obligation.weighted_borrowed_value_upper_bound_usd,
                    ),
                    borrow_weight(config(reserve)),
                ),
            ),
        )
    }

    // calculate the maximum amount that can be withdrawn from an obligation
    public(package) fun max_withdraw_amount<P>(
        obligation: &Obligation<P>,
        reserve: &Reserve<P>,
    ): u64 {
        let deposit_index = find_deposit_index(obligation, reserve);
        assert!(deposit_index < vector::length(&obligation.deposits), EDepositNotFound);

        let deposit = vector::borrow(&obligation.deposits, deposit_index);

        if (
            open_ltv(config(reserve)) == decimal::from(0) || vector::length(&obligation.borrows) == 0
        ) {
            return deposit.deposited_ctoken_amount
        };

        let max_withdraw_value = div(
            saturating_sub(
                obligation.allowed_borrow_value_usd,
                obligation.weighted_borrowed_value_upper_bound_usd,
            ),
            open_ltv(config(reserve)),
        );

        let max_withdraw_token_amount = reserve::usd_to_token_amount_upper_bound(
            reserve,
            max_withdraw_value,
        );

        floor(
            min(
                decimal::from(deposit.deposited_ctoken_amount),
                div(
                    max_withdraw_token_amount,
                    reserve::ctoken_ratio(reserve),
                ),
            ),
        )
    }

    public(package) fun assert_no_stale_oracles(exist_stale_oracles: Option<ExistStaleOracles>) {
        assert!(option::is_none(&exist_stale_oracles), EOraclesAreStale);
        option::destroy_none(exist_stale_oracles);
    }

    public(package) fun zero_out_rewards_if_looped<P>(
        obligation: &mut Obligation<P>,
        reserves: &mut vector<Reserve<P>>,
        clock: &Clock,
    ) {
        if (is_looped(obligation)) {
            zero_out_rewards(obligation, reserves, clock);
        };
    }

    // === Private Functions ===
    public(package) fun is_looped<P>(obligation: &Obligation<P>): bool {
        let target_reserve_array_indices = vector[1, 2, 5, 7, 19, 20, 3, 9];

        // The vector target_reserve_array_indices maps to disabled_pairings_map
        // by corresponding indices of each element
        // target_reserve_index --> pairings disabled
        let disabled_pairings_map = vector[
            vector[2, 5, 7, 19, 20], // 1 --> [2, 5, 7, 19, 20]
            vector[1, 5, 7, 19, 20], // 2 --> [1, 5, 7, 19, 20]
            vector[1, 2, 7, 19, 20], // 5 --> [1, 2, 7, 19, 20]
            vector[1, 2, 5, 19, 20], // 7 --> [1, 2, 5, 19, 20]
            vector[1, 2, 5, 7, 20], // 19 --> [1, 2, 5, 7, 20]
            vector[1, 2, 5, 7, 19], // 20 --> [1, 2, 5, 7, 19]
            vector[9], // 3 --> [9]
            vector[3], // 9 --> [3]
        ];

        let mut i = 0;
        while (i < vector::length(&obligation.borrows)) {
            let borrow = vector::borrow(&obligation.borrows, i);

            // Check if borrow-deposit reserve match
            let deposit_index = find_deposit_index_by_reserve_array_index(
                obligation,
                borrow.reserve_array_index,
            );

            if (deposit_index < vector::length(&obligation.deposits)) {
                return true
            };

            let (has_target_borrow_idx, target_borrow_idx) = vector::index_of(
                &target_reserve_array_indices,
                &borrow.reserve_array_index,
            );

            // If the borrowing is over a targetted reserve
            // we check if the deposit reserve is a disabled pair
            if (has_target_borrow_idx) {
                let disabled_pairs = vector::borrow(&disabled_pairings_map, target_borrow_idx);
                let pair_count = vector::length(disabled_pairs);
                let mut i = 0;

                while (i < pair_count) {
                    let disabled_reserve_array_index = *vector::borrow(disabled_pairs, i);

                    let deposit_index = find_deposit_index_by_reserve_array_index(
                        obligation,
                        disabled_reserve_array_index,
                    );

                    if (deposit_index < vector::length(&obligation.deposits)) {
                        return true
                    };

                    i = i +1;
                };
            };

            i = i + 1;
        };

        false
    }

    fun zero_out_rewards<P>(
        obligation: &mut Obligation<P>,
        reserves: &mut vector<Reserve<P>>,
        clock: &Clock,
    ) {
        {
            let mut i = 0;
            while (i < vector::length(&obligation.deposits)) {
                let deposit = vector::borrow(&obligation.deposits, i);
                let reserve = vector::borrow_mut(reserves, deposit.reserve_array_index);

                let user_reward_manager = vector::borrow_mut(
                    &mut obligation.user_reward_managers,
                    deposit.user_reward_manager_index,
                );

                liquidity_mining::change_user_reward_manager_share(
                    reserve::deposits_pool_reward_manager_mut(reserve),
                    user_reward_manager,
                    0,
                    clock,
                );

                i = i + 1;
            };
        };

        {
            let mut i = 0;
            while (i < vector::length(&obligation.borrows)) {
                let borrow = vector::borrow(&obligation.borrows, i);
                let reserve = vector::borrow_mut(reserves, borrow.reserve_array_index);

                let user_reward_manager = vector::borrow_mut(
                    &mut obligation.user_reward_managers,
                    borrow.user_reward_manager_index,
                );

                liquidity_mining::change_user_reward_manager_share(
                    reserve::borrows_pool_reward_manager_mut(reserve),
                    user_reward_manager,
                    0,
                    clock,
                );

                i = i + 1;
            };
        };
    }

    fun log_obligation_data<P>(obligation: &Obligation<P>) {
        event::emit(ObligationDataEvent {
            lending_market_id: object::id_to_address(&obligation.lending_market_id),
            obligation_id: object::uid_to_address(&obligation.id),
            deposits: {
                let mut i = 0;
                let mut deposits = vector::empty<DepositRecord>();
                while (i < vector::length(&obligation.deposits)) {
                    let deposit = vector::borrow(&obligation.deposits, i);
                    vector::push_back(
                        &mut deposits,
                        DepositRecord {
                            coin_type: deposit.coin_type,
                            reserve_array_index: deposit.reserve_array_index,
                            deposited_ctoken_amount: deposit.deposited_ctoken_amount,
                            market_value: deposit.market_value,
                            user_reward_manager_index: deposit.user_reward_manager_index,
                            attributed_borrow_value: deposit.attributed_borrow_value,
                        },
                    );

                    i = i + 1;
                };

                deposits
            },
            borrows: {
                let mut i = 0;
                let mut borrows = vector::empty<BorrowRecord>();
                while (i < vector::length(&obligation.borrows)) {
                    let borrow = vector::borrow(&obligation.borrows, i);
                    vector::push_back(
                        &mut borrows,
                        BorrowRecord {
                            coin_type: borrow.coin_type,
                            reserve_array_index: borrow.reserve_array_index,
                            borrowed_amount: borrow.borrowed_amount,
                            cumulative_borrow_rate: borrow.cumulative_borrow_rate,
                            market_value: borrow.market_value,
                            user_reward_manager_index: borrow.user_reward_manager_index,
                        },
                    );

                    i = i + 1;
                };

                borrows
            },
            deposited_value_usd: obligation.deposited_value_usd,
            allowed_borrow_value_usd: obligation.allowed_borrow_value_usd,
            unhealthy_borrow_value_usd: obligation.unhealthy_borrow_value_usd,
            super_unhealthy_borrow_value_usd: obligation.super_unhealthy_borrow_value_usd,
            unweighted_borrowed_value_usd: obligation.unweighted_borrowed_value_usd,
            weighted_borrowed_value_usd: obligation.weighted_borrowed_value_usd,
            weighted_borrowed_value_upper_bound_usd: obligation.weighted_borrowed_value_upper_bound_usd,
            borrowing_isolated_asset: obligation.borrowing_isolated_asset,
            bad_debt_usd: obligation.bad_debt_usd,
            closable: obligation.closable,
        });
    }

    fun liability_shares(borrow: &Borrow): u64 {
        floor(
            div(
                borrow.borrowed_amount,
                borrow.cumulative_borrow_rate,
            ),
        )
    }

    /// Withdraw without checking if the obligation is healthy.
    fun withdraw_unchecked<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
        ctoken_amount: u64,
    ) {
        let deposit_index = find_deposit_index(obligation, reserve);
        assert!(deposit_index < vector::length(&obligation.deposits), EDepositNotFound);
        let deposit = vector::borrow_mut(&mut obligation.deposits, deposit_index);

        let withdraw_market_value = reserve::ctoken_market_value(reserve, ctoken_amount);

        // update health values
        deposit.market_value = sub(deposit.market_value, withdraw_market_value);
        deposit.deposited_ctoken_amount = deposit.deposited_ctoken_amount - ctoken_amount;

        obligation.deposited_value_usd = sub(obligation.deposited_value_usd, withdraw_market_value);
        obligation.allowed_borrow_value_usd =
            sub(
                obligation.allowed_borrow_value_usd,
                mul(
                    reserve::ctoken_market_value_lower_bound(reserve, ctoken_amount),
                    open_ltv(config(reserve)),
                ),
            );
        obligation.unhealthy_borrow_value_usd =
            sub(
                obligation.unhealthy_borrow_value_usd,
                mul(
                    withdraw_market_value,
                    close_ltv(config(reserve)),
                ),
            );

        let user_reward_manager = vector::borrow_mut(
            &mut obligation.user_reward_managers,
            deposit.user_reward_manager_index,
        );
        liquidity_mining::change_user_reward_manager_share(
            reserve::deposits_pool_reward_manager_mut(reserve),
            user_reward_manager,
            deposit.deposited_ctoken_amount,
            clock,
        );

        if (deposit.deposited_ctoken_amount == 0) {
            let Deposit {
                coin_type: _,
                reserve_array_index: _,
                deposited_ctoken_amount: _,
                market_value: _,
                attributed_borrow_value: _,
                user_reward_manager_index: _,
            } = vector::remove(&mut obligation.deposits, deposit_index);
        };
    }

    /// Compound the debt on a borrow object
    fun compound_debt<P>(borrow: &mut Borrow, reserve: &Reserve<P>) {
        let new_cumulative_borrow_rate = reserve::cumulative_borrow_rate(reserve);

        let compounded_interest_rate = div(
            new_cumulative_borrow_rate,
            borrow.cumulative_borrow_rate,
        );

        borrow.borrowed_amount =
            mul(
                borrow.borrowed_amount,
                compounded_interest_rate,
            );

        borrow.cumulative_borrow_rate = new_cumulative_borrow_rate;
    }

    fun find_deposit_index<P>(obligation: &Obligation<P>, reserve: &Reserve<P>): u64 {
        let mut i = 0;
        while (i < vector::length(&obligation.deposits)) {
            let deposit = vector::borrow(&obligation.deposits, i);
            if (deposit.reserve_array_index == reserve::array_index(reserve)) {
                return i
            };

            i = i + 1;
        };

        i
    }

    fun find_deposit_index_by_reserve_array_index<P>(
        obligation: &Obligation<P>,
        reserve_array_index: u64,
    ): u64 {
        let mut i = 0;
        while (i < vector::length(&obligation.deposits)) {
            let deposit = vector::borrow(&obligation.deposits, i);
            if (deposit.reserve_array_index == reserve_array_index) {
                return i
            };

            i = i + 1;
        };

        i
    }

    fun find_borrow_index<P>(obligation: &Obligation<P>, reserve: &Reserve<P>): u64 {
        let mut i = 0;
        while (i < vector::length(&obligation.borrows)) {
            let borrow = vector::borrow(&obligation.borrows, i);
            if (borrow.reserve_array_index == reserve::array_index(reserve)) {
                return i
            };

            i = i + 1;
        };

        i
    }

    public(package) fun find_borrow<P>(obligation: &Obligation<P>, reserve: &Reserve<P>): &Borrow {
        let i = find_borrow_index(obligation, reserve);
        assert!(i < vector::length(&obligation.borrows), EBorrowNotFound);

        vector::borrow(&obligation.borrows, i)
    }

    public(package) fun find_deposit<P>(
        obligation: &Obligation<P>,
        reserve: &Reserve<P>,
    ): &Deposit {
        let i = find_deposit_index(obligation, reserve);
        assert!(i < vector::length(&obligation.deposits), EDepositNotFound);

        vector::borrow(&obligation.deposits, i)
    }

    fun find_or_add_borrow<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
    ): u64 {
        let i = find_borrow_index(obligation, reserve);
        if (i < vector::length(&obligation.borrows)) {
            return i
        };

        let (user_reward_manager_index, _) = find_or_add_user_reward_manager(
            obligation,
            reserve::borrows_pool_reward_manager_mut(reserve),
            clock,
        );

        let borrow = Borrow {
            coin_type: reserve::coin_type(reserve),
            reserve_array_index: reserve::array_index(reserve),
            borrowed_amount: decimal::from(0),
            cumulative_borrow_rate: reserve::cumulative_borrow_rate(reserve),
            market_value: decimal::from(0),
            user_reward_manager_index,
        };

        vector::push_back(&mut obligation.borrows, borrow);
        vector::length(&obligation.borrows) - 1
    }

    fun find_or_add_deposit<P>(
        obligation: &mut Obligation<P>,
        reserve: &mut Reserve<P>,
        clock: &Clock,
    ): u64 {
        let i = find_deposit_index(obligation, reserve);
        if (i < vector::length(&obligation.deposits)) {
            return i
        };

        let (user_reward_manager_index, _) = find_or_add_user_reward_manager(
            obligation,
            reserve::deposits_pool_reward_manager_mut(reserve),
            clock,
        );

        let deposit = Deposit {
            coin_type: reserve::coin_type(reserve),
            reserve_array_index: reserve::array_index(reserve),
            deposited_ctoken_amount: 0,
            market_value: decimal::from(0),
            user_reward_manager_index,
            attributed_borrow_value: decimal::from(0),
        };

        vector::push_back(&mut obligation.deposits, deposit);
        vector::length(&obligation.deposits) - 1
    }

    public(package) fun find_user_reward_manager_index<P>(
        obligation: &Obligation<P>,
        pool_reward_manager: &PoolRewardManager,
    ): u64 {
        let mut i = 0;
        while (i < vector::length(&obligation.user_reward_managers)) {
            let user_reward_manager = vector::borrow(&obligation.user_reward_managers, i);
            if (
                liquidity_mining::pool_reward_manager_id(user_reward_manager) == object::id(pool_reward_manager)
            ) {
                return i
            };

            i = i + 1;
        };

        i
    }

    fun find_or_add_user_reward_manager<P>(
        obligation: &mut Obligation<P>,
        pool_reward_manager: &mut PoolRewardManager,
        clock: &Clock,
    ): (u64, &mut UserRewardManager) {
        let i = find_user_reward_manager_index(obligation, pool_reward_manager);
        if (i < vector::length(&obligation.user_reward_managers)) {
            return (i, vector::borrow_mut(&mut obligation.user_reward_managers, i))
        };

        let user_reward_manager = liquidity_mining::new_user_reward_manager(
            pool_reward_manager,
            clock,
        );
        vector::push_back(&mut obligation.user_reward_managers, user_reward_manager);
        let length = vector::length(&obligation.user_reward_managers);

        (length - 1, vector::borrow_mut(&mut obligation.user_reward_managers, length - 1))
    }

    #[test_only]
    public(package) fun borrows_mut<P>(obligation: &mut Obligation<P>): &mut vector<Borrow> {
        &mut obligation.borrows
    }

    #[test_only]
    public(package) fun create_borrow_for_testing(
        coin_type: TypeName,
        reserve_array_index: u64,
        borrowed_amount: Decimal,
        cumulative_borrow_rate: Decimal,
        market_value: Decimal,
        user_reward_manager_index: u64,
    ): Borrow {
        Borrow {
            coin_type,
            reserve_array_index,
            borrowed_amount,
            cumulative_borrow_rate,
            market_value,
            user_reward_manager_index,
        }
    }
}
