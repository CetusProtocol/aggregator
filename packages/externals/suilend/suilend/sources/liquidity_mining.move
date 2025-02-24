/// A user_reward_manager farms pool_rewards to receive rewards proportional to their stake in the pool.
module suilend::liquidity_mining {
    use std::type_name::{Self, TypeName};
    use sui::bag::{Self, Bag};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use suilend::decimal::{Self, Decimal, add, sub, mul, div, floor};

    // === Errors ===
    const EIdMismatch: u64 = 0;
    const EInvalidTime: u64 = 1;
    const EInvalidType: u64 = 2;
    const EMaxConcurrentPoolRewardsViolated: u64 = 3;
    const ENotAllRewardsClaimed: u64 = 4;
    const EPoolRewardPeriodNotOver: u64 = 5;

    // === Constants ===
    const MAX_REWARDS: u64 = 50;
    const MIN_REWARD_PERIOD_MS: u64 = 3_600_000;

    /// This struct manages all pool_rewards for a given stake pool.
    public struct PoolRewardManager has key, store {
        id: UID,
        total_shares: u64,
        pool_rewards: vector<Option<PoolReward>>,
        last_update_time_ms: u64,
    }

    public struct PoolReward has key, store {
        id: UID,
        pool_reward_manager_id: ID,
        coin_type: TypeName,
        start_time_ms: u64,
        end_time_ms: u64,
        total_rewards: u64,
        /// amount of rewards that have been earned by users
        allocated_rewards: Decimal,
        cumulative_rewards_per_share: Decimal,
        num_user_reward_managers: u64,
        additional_fields: Bag,
    }

    // == Dynamic Field Keys
    public struct RewardBalance<phantom T> has copy, drop, store {}

    public struct UserRewardManager has store {
        pool_reward_manager_id: ID,
        share: u64,
        rewards: vector<Option<UserReward>>,
        last_update_time_ms: u64,
    }

    public struct UserReward has store {
        pool_reward_id: ID,
        earned_rewards: Decimal,
        cumulative_rewards_per_share: Decimal,
    }

    // === Public-View Functions ===
    public fun pool_reward_manager_id(user_reward_manager: &UserRewardManager): ID {
        user_reward_manager.pool_reward_manager_id
    }

    public fun shares(user_reward_manager: &UserRewardManager): u64 {
        user_reward_manager.share
    }

    public fun last_update_time_ms(user_reward_manager: &UserRewardManager): u64 {
        user_reward_manager.last_update_time_ms
    }

    public fun pool_reward_id(pool_reward_manager: &PoolRewardManager, index: u64): ID {
        let optional_pool_reward = vector::borrow(&pool_reward_manager.pool_rewards, index);
        let pool_reward = option::borrow(optional_pool_reward);
        object::id(pool_reward)
    }

    public fun pool_reward(
        pool_reward_manager: &PoolRewardManager,
        index: u64,
    ): &Option<PoolReward> {
        vector::borrow(&pool_reward_manager.pool_rewards, index)
    }

    public fun end_time_ms(pool_reward: &PoolReward): u64 {
        pool_reward.end_time_ms
    }

    // === Public-Friend functions
    public(package) fun new_pool_reward_manager(ctx: &mut TxContext): PoolRewardManager {
        PoolRewardManager {
            id: object::new(ctx),
            total_shares: 0,
            pool_rewards: vector::empty(),
            last_update_time_ms: 0,
        }
    }

    public(package) fun add_pool_reward<T>(
        pool_reward_manager: &mut PoolRewardManager,
        rewards: Balance<T>,
        start_time_ms: u64,
        end_time_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let start_time_ms = std::u64::max(start_time_ms, clock::timestamp_ms(clock));
        assert!(end_time_ms - start_time_ms >= MIN_REWARD_PERIOD_MS, EInvalidTime);

        let pool_reward = PoolReward {
            id: object::new(ctx),
            pool_reward_manager_id: object::id(pool_reward_manager),
            coin_type: type_name::get<T>(),
            start_time_ms,
            end_time_ms,
            total_rewards: balance::value(&rewards),
            allocated_rewards: decimal::from(0),
            cumulative_rewards_per_share: decimal::from(0),
            num_user_reward_managers: 0,
            additional_fields: {
                let mut bag = bag::new(ctx);
                bag::add(&mut bag, RewardBalance<T> {}, rewards);
                bag
            },
        };

        let i = find_available_index(pool_reward_manager);
        assert!(i < MAX_REWARDS, EMaxConcurrentPoolRewardsViolated);

        let optional_pool_reward = vector::borrow_mut(&mut pool_reward_manager.pool_rewards, i);
        option::fill(optional_pool_reward, pool_reward);
    }

    /// Close pool_reward campaign, claim dust amounts of rewards, and destroy object.
    /// This can only be called if the pool_reward period is over and all rewards have been claimed.
    public(package) fun close_pool_reward<T>(
        pool_reward_manager: &mut PoolRewardManager,
        index: u64,
        clock: &Clock,
    ): Balance<T> {
        let optional_pool_reward = vector::borrow_mut(&mut pool_reward_manager.pool_rewards, index);
        let PoolReward {
            id,
            pool_reward_manager_id: _,
            coin_type: _,
            start_time_ms: _,
            end_time_ms,
            total_rewards: _,
            allocated_rewards: _,
            cumulative_rewards_per_share: _,
            num_user_reward_managers,
            mut additional_fields,
        } = option::extract(optional_pool_reward);

        object::delete(id);

        let cur_time_ms = clock::timestamp_ms(clock);

        assert!(cur_time_ms >= end_time_ms, EPoolRewardPeriodNotOver);
        assert!(num_user_reward_managers == 0, ENotAllRewardsClaimed);

        let reward_balance: Balance<T> = bag::remove(
            &mut additional_fields,
            RewardBalance<T> {},
        );

        bag::destroy_empty(additional_fields);

        reward_balance
    }

    /// Cancel pool_reward campaign and claim unallocated rewards. Effectively sets the
    /// end time of the pool_reward campaign to the current time.
    public(package) fun cancel_pool_reward<T>(
        pool_reward_manager: &mut PoolRewardManager,
        index: u64,
        clock: &Clock,
    ): Balance<T> {
        update_pool_reward_manager(pool_reward_manager, clock);

        let pool_reward = option::borrow_mut(
            vector::borrow_mut(&mut pool_reward_manager.pool_rewards, index),
        );
        let cur_time_ms = clock::timestamp_ms(clock);

        let unallocated_rewards = floor(
            sub(
                decimal::from(pool_reward.total_rewards),
                pool_reward.allocated_rewards,
            ),
        );

        pool_reward.end_time_ms = cur_time_ms;
        pool_reward.total_rewards = 0;

        let reward_balance: &mut Balance<T> = bag::borrow_mut(
            &mut pool_reward.additional_fields,
            RewardBalance<T> {},
        );

        balance::split(reward_balance, unallocated_rewards)
    }

    fun update_pool_reward_manager(pool_reward_manager: &mut PoolRewardManager, clock: &Clock) {
        let cur_time_ms = clock::timestamp_ms(clock);

        if (cur_time_ms == pool_reward_manager.last_update_time_ms) {
            return
        };

        if (pool_reward_manager.total_shares == 0) {
            pool_reward_manager.last_update_time_ms = cur_time_ms;
            return
        };

        let mut i = 0;
        while (i < vector::length(&pool_reward_manager.pool_rewards)) {
            let optional_pool_reward = vector::borrow_mut(&mut pool_reward_manager.pool_rewards, i);
            if (option::is_none(optional_pool_reward)) {
                i = i + 1;
                continue
            };

            let pool_reward = option::borrow_mut(optional_pool_reward);
            if (
                cur_time_ms < pool_reward.start_time_ms || 
                pool_reward_manager.last_update_time_ms >= pool_reward.end_time_ms
            ) {
                i = i + 1;
                continue
            };

            let time_passed_ms =
                std::u64::min(cur_time_ms, pool_reward.end_time_ms) - 
                std::u64::max(pool_reward.start_time_ms, pool_reward_manager.last_update_time_ms);

            let unlocked_rewards = div(
                mul(
                    decimal::from(pool_reward.total_rewards),
                    decimal::from(time_passed_ms),
                ),
                decimal::from(pool_reward.end_time_ms - pool_reward.start_time_ms),
            );
            pool_reward.allocated_rewards = add(pool_reward.allocated_rewards, unlocked_rewards);

            pool_reward.cumulative_rewards_per_share =
                add(
                    pool_reward.cumulative_rewards_per_share,
                    div(
                        unlocked_rewards,
                        decimal::from(pool_reward_manager.total_shares),
                    ),
                );

            i = i + 1;
        };

        pool_reward_manager.last_update_time_ms = cur_time_ms;
    }

    fun update_user_reward_manager(
        pool_reward_manager: &mut PoolRewardManager,
        user_reward_manager: &mut UserRewardManager,
        clock: &Clock,
        new_user_reward_manager: bool,
    ) {
        assert!(
            object::id(pool_reward_manager) == user_reward_manager.pool_reward_manager_id,
            EIdMismatch,
        );
        update_pool_reward_manager(pool_reward_manager, clock);

        let cur_time_ms = clock::timestamp_ms(clock);
        if (!new_user_reward_manager && cur_time_ms == user_reward_manager.last_update_time_ms) {
            return
        };

        let mut i = 0;
        while (i < vector::length(&pool_reward_manager.pool_rewards)) {
            let optional_pool_reward = vector::borrow_mut(&mut pool_reward_manager.pool_rewards, i);
            if (option::is_none(optional_pool_reward)) {
                i = i + 1;
                continue
            };

            let pool_reward = option::borrow_mut(optional_pool_reward);

            while (vector::length(&user_reward_manager.rewards) <= i) {
                vector::push_back(&mut user_reward_manager.rewards, option::none());
            };

            let optional_reward = vector::borrow_mut(&mut user_reward_manager.rewards, i);
            if (option::is_none(optional_reward)) {
                if (user_reward_manager.last_update_time_ms <= pool_reward.end_time_ms) {
                    option::fill(
                        optional_reward,
                        UserReward {
                            pool_reward_id: object::id(pool_reward),
                            earned_rewards: {
                                if (
                                    user_reward_manager.last_update_time_ms <= pool_reward.start_time_ms
                                ) {
                                    mul(
                                        pool_reward.cumulative_rewards_per_share,
                                        decimal::from(user_reward_manager.share),
                                    )
                                } else {
                                    decimal::from(0)
                                }
                            },
                            cumulative_rewards_per_share: pool_reward.cumulative_rewards_per_share,
                        },
                    );

                    pool_reward.num_user_reward_managers = pool_reward.num_user_reward_managers + 1;
                };
            } else {
                let reward = option::borrow_mut(optional_reward);
                let new_rewards = mul(
                    sub(
                        pool_reward.cumulative_rewards_per_share,
                        reward.cumulative_rewards_per_share,
                    ),
                    decimal::from(user_reward_manager.share),
                );

                reward.earned_rewards = add(reward.earned_rewards, new_rewards);
                reward.cumulative_rewards_per_share = pool_reward.cumulative_rewards_per_share;
            };

            i = i + 1;
        };

        user_reward_manager.last_update_time_ms = cur_time_ms;
    }

    /// Create a new user_reward_manager object with zero share.
    public(package) fun new_user_reward_manager(
        pool_reward_manager: &mut PoolRewardManager,
        clock: &Clock,
    ): UserRewardManager {
        let mut user_reward_manager = UserRewardManager {
            pool_reward_manager_id: object::id(pool_reward_manager),
            share: 0,
            rewards: vector::empty(),
            last_update_time_ms: clock::timestamp_ms(clock),
        };

        // needed to populate the rewards vector
        update_user_reward_manager(pool_reward_manager, &mut user_reward_manager, clock, true);

        user_reward_manager
    }

    public(package) fun change_user_reward_manager_share(
        pool_reward_manager: &mut PoolRewardManager,
        user_reward_manager: &mut UserRewardManager,
        new_share: u64,
        clock: &Clock,
    ) {
        update_user_reward_manager(pool_reward_manager, user_reward_manager, clock, false);

        pool_reward_manager.total_shares =
            pool_reward_manager.total_shares - user_reward_manager.share + new_share;
        user_reward_manager.share = new_share;
    }

    public(package) fun claim_rewards<T>(
        pool_reward_manager: &mut PoolRewardManager,
        user_reward_manager: &mut UserRewardManager,
        clock: &Clock,
        reward_index: u64,
    ): Balance<T> {
        update_user_reward_manager(pool_reward_manager, user_reward_manager, clock, false);

        let pool_reward = option::borrow_mut(
            vector::borrow_mut(&mut pool_reward_manager.pool_rewards, reward_index),
        );
        assert!(pool_reward.coin_type == type_name::get<T>(), EInvalidType);

        let optional_reward = vector::borrow_mut(&mut user_reward_manager.rewards, reward_index);
        let reward = option::borrow_mut(optional_reward);

        let claimable_rewards = floor(reward.earned_rewards);

        reward.earned_rewards = sub(reward.earned_rewards, decimal::from(claimable_rewards));
        let reward_balance: &mut Balance<T> = bag::borrow_mut(
            &mut pool_reward.additional_fields,
            RewardBalance<T> {},
        );

        if (clock::timestamp_ms(clock) >= pool_reward.end_time_ms) {
            let UserReward {
                pool_reward_id: _,
                earned_rewards: _,
                cumulative_rewards_per_share: _,
            } = option::extract(optional_reward);

            pool_reward.num_user_reward_managers = pool_reward.num_user_reward_managers - 1;
        };

        balance::split(reward_balance, claimable_rewards)
    }

    // === Private Functions ===
    fun find_available_index(pool_reward_manager: &mut PoolRewardManager): u64 {
        let mut i = 0;
        while (i < vector::length(&pool_reward_manager.pool_rewards)) {
            let optional_pool_reward = vector::borrow(&pool_reward_manager.pool_rewards, i);
            if (option::is_none(optional_pool_reward)) {
                return i
            };

            i = i + 1;
        };

        vector::push_back(&mut pool_reward_manager.pool_rewards, option::none());

        i
    }

    #[test_only]
    public struct USDC has drop {}

    #[test_only]
    public struct SUI has drop {}

    #[test_only]
    const MILLISECONDS_IN_DAY: u64 = 86_400_000;

    #[test]
    fun test_pool_reward_manager_basic() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            100,
            &clock,
        );

        // at this point, user_reward_manager 1 has earned 50 dollars
        clock::set_for_testing(&mut clock, 5 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 25 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };

        let mut user_reward_manager_2 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            400,
            &clock,
        );

        clock::set_for_testing(&mut clock, 10 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 5 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_2,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 20 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };

        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            250,
            &clock,
        );
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            250,
            &clock,
        );

        clock::set_for_testing(&mut clock, 20 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 25 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_2,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 25 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };

        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        sui::test_utils::destroy(user_reward_manager_2);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pool_reward_manager_multiple_rewards() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        let sui = balance::create_for_testing<SUI>(100 * 1_000_000);
        add_pool_reward(
            &mut pool_reward_manager,
            sui,
            10 * MILLISECONDS_IN_DAY,
            20 * MILLISECONDS_IN_DAY,
            &clock,
            ctx,
        );

        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            100,
            &clock,
        );

        clock::set_for_testing(&mut clock, 15 * MILLISECONDS_IN_DAY);
        let mut user_reward_manager_2 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            100,
            &clock,
        );

        clock::set_for_testing(&mut clock, 30 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 87_500_000, 0);
            sui::test_utils::destroy(usdc);
        };
        {
            let sui = claim_rewards<SUI>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                1,
            );
            assert!(balance::value(&sui) == 75 * 1_000_000, 0);
            sui::test_utils::destroy(sui);
        };

        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_2,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 12_500_000, 0);
            sui::test_utils::destroy(usdc);
        };
        {
            let sui = claim_rewards<SUI>(
                &mut pool_reward_manager,
                &mut user_reward_manager_2,
                &clock,
                1,
            );
            assert!(balance::value(&sui) == 25 * 1_000_000, 0);
            sui::test_utils::destroy(sui);
        };

        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        sui::test_utils::destroy(user_reward_manager_2);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pool_reward_manager_cancel_and_close() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            100,
            &clock,
        );

        clock::set_for_testing(&mut clock, 10 * MILLISECONDS_IN_DAY);

        let unallocated_rewards = cancel_pool_reward<USDC>(&mut pool_reward_manager, 0, &clock);
        assert!(balance::value(&unallocated_rewards) == 50 * 1_000_000, 0);

        clock::set_for_testing(&mut clock, 15 * MILLISECONDS_IN_DAY);
        let user_reward_manager_rewards = claim_rewards<USDC>(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            &clock,
            0,
        );
        assert!(balance::value(&user_reward_manager_rewards) == 50 * 1_000_000, 0);

        let dust_rewards = close_pool_reward<USDC>(&mut pool_reward_manager, 0, &clock);
        assert!(balance::value(&dust_rewards) == 0, 0);

        sui::test_utils::destroy(unallocated_rewards);
        sui::test_utils::destroy(user_reward_manager_rewards);
        sui::test_utils::destroy(dust_rewards);
        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pool_reward_manager_zero_share() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        clock::set_for_testing(&mut clock, 10 * MILLISECONDS_IN_DAY);
        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            1,
            &clock,
        );

        clock::set_for_testing(&mut clock, 20 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            // 50 usdc is unallocated since there was zero share from 0-10 seconds
            assert!(balance::value(&usdc) == 50 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };

        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pool_reward_manager_auto_farm() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);

        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            1,
            &clock,
        );

        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        clock::set_for_testing(&mut clock, 10 * MILLISECONDS_IN_DAY);
        let mut user_reward_manager_2 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            1,
            &clock,
        );

        clock::set_for_testing(&mut clock, 20 * MILLISECONDS_IN_DAY);
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_1,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 75 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            1,
            &clock,
        );
        {
            let usdc = claim_rewards<USDC>(
                &mut pool_reward_manager,
                &mut user_reward_manager_2,
                &clock,
                0,
            );
            assert!(balance::value(&usdc) == 25 * 1_000_000, 0);
            sui::test_utils::destroy(usdc);
        };

        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        sui::test_utils::destroy(user_reward_manager_2);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = EMaxConcurrentPoolRewardsViolated)]
    fun test_add_too_many_pool_rewards() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let mut i = 0;
        while (i < MAX_REWARDS) {
            let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
            add_pool_reward(
                &mut pool_reward_manager,
                usdc,
                0,
                20 * MILLISECONDS_IN_DAY,
                &clock,
                ctx,
            );
            i = i + 1;
        };

        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);

        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pool_reward_manager_cancel_and_close_regression() {
        use sui::test_scenario::{Self};

        let owner = @0x26;
        let mut scenario = test_scenario::begin(owner);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 0);

        let mut pool_reward_manager = new_pool_reward_manager(ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(&mut pool_reward_manager, usdc, 0, 20 * MILLISECONDS_IN_DAY, &clock, ctx);
        let usdc = balance::create_for_testing<USDC>(100 * 1_000_000);
        add_pool_reward(
            &mut pool_reward_manager,
            usdc,
            20 * MILLISECONDS_IN_DAY,
            30 * MILLISECONDS_IN_DAY,
            &clock,
            ctx,
        );

        let mut user_reward_manager_1 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            100,
            &clock,
        );

        clock::set_for_testing(&mut clock, 10 * MILLISECONDS_IN_DAY);

        let unallocated_rewards = cancel_pool_reward<USDC>(&mut pool_reward_manager, 0, &clock);
        assert!(balance::value(&unallocated_rewards) == 50 * 1_000_000, 0);

        clock::set_for_testing(&mut clock, 15 * MILLISECONDS_IN_DAY);
        let user_reward_manager_rewards = claim_rewards<USDC>(
            &mut pool_reward_manager,
            &mut user_reward_manager_1,
            &clock,
            0,
        );
        assert!(balance::value(&user_reward_manager_rewards) == 50 * 1_000_000, 0);

        let dust_rewards = close_pool_reward<USDC>(&mut pool_reward_manager, 0, &clock);
        assert!(balance::value(&dust_rewards) == 0, 0);

        clock::set_for_testing(&mut clock, 20 * MILLISECONDS_IN_DAY);

        let mut user_reward_manager_2 = new_user_reward_manager(&mut pool_reward_manager, &clock);
        change_user_reward_manager_share(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            100,
            &clock,
        );

        clock::set_for_testing(&mut clock, 30 * MILLISECONDS_IN_DAY);
        let user_reward_manager_rewards_2 = claim_rewards<USDC>(
            &mut pool_reward_manager,
            &mut user_reward_manager_2,
            &clock,
            1,
        );
        std::debug::print(&balance::value(&user_reward_manager_rewards_2));

        assert!(balance::value(&user_reward_manager_rewards_2) == 50 * 1_000_000, 0);

        sui::test_utils::destroy(unallocated_rewards);
        sui::test_utils::destroy(user_reward_manager_rewards);
        sui::test_utils::destroy(user_reward_manager_rewards_2);
        sui::test_utils::destroy(dust_rewards);
        sui::test_utils::destroy(clock);
        sui::test_utils::destroy(pool_reward_manager);
        sui::test_utils::destroy(user_reward_manager_1);
        sui::test_utils::destroy(user_reward_manager_2);
        test_scenario::end(scenario);
    }
}
