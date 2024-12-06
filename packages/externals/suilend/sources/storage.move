module liquid_staking::storage {
    use sui_system::staking_pool::{StakedSui, FungibleStakedSui, PoolTokenExchangeRate};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui_system::sui_system::{SuiSystemState};
    use std::u64::{min, max};
    use sui::bag::{Self, Bag};

    /* Errors */
    const ENotEnoughSuiInSuiPool: u64 = 0;
    const ENotActiveValidator: u64 = 1;
    const ETooManyValidators: u64 = 2;
    const EValidatorAlreadyExists: u64 = 3;

    /* Constants */
    const MIN_STAKE_THRESHOLD: u64 = 1_000_000_000;
    const MAX_SUI_SUPPLY: u64 = 10_000_000_000 * 1_000_000_000;
    const MAX_VALIDATORS: u64 = 50;
    const ACTIVE_STAKE_REDEEM_OFFSET: u64 = 100;

    /// The Storage struct holds all stake for the LST.
    public struct Storage has store {
        /// Sui balance. Unstake operations deposit SUI here. 
        sui_pool: Balance<SUI>,
        /// Validators that have stake in the LST.
        validator_infos: vector<ValidatorInfo>,
        /// Total Sui managed by the LST. This is the sum of all active 
        /// stake, inactive stake, and SUI in the sui_pool.
        total_sui_supply: u64,
        /// The epoch at which the storage was last refreshed.
        last_refresh_epoch: u64,
        /// Extra fields for future-proofing.
        extra_fields: Bag
    }

    /// ValidatorInfo holds all stake for a single validator.
    public struct ValidatorInfo has store {
        /// The staking pool ID for the validator.
        staking_pool_id: ID,
        /// The validator's address.
        validator_address: address,
        /// The active stake for the validator.
        active_stake: Option<FungibleStakedSui>,
        /// The inactive stake for the validator.
        inactive_stake: Option<StakedSui>,
        /// The exchange rate for the validator.
        exchange_rate: PoolTokenExchangeRate,
        /// The total Sui staked to the validator (active stake + inactive stake).
        total_sui_amount: u64,
        /// Extra fields for future-proofing.
        extra_fields: Bag
    }

    public(package) fun new(ctx: &mut TxContext): Storage {
        Storage {
            sui_pool: balance::zero(),
            validator_infos: vector::empty(),
            total_sui_supply: 0,
            last_refresh_epoch: ctx.epoch(),
            extra_fields: bag::new(ctx)
        }
    }

    /* Public View Functions */
    public(package) fun sui_pool(self: &Storage): &Balance<SUI> {
        &self.sui_pool
    }

    public(package) fun validators(self: &Storage): &vector<ValidatorInfo> {
        &self.validator_infos
    }

    public(package) fun total_sui_supply(self: &Storage): u64 {
        self.total_sui_supply
    }

    public(package) fun last_refresh_epoch(self: &Storage): u64 {
        self.last_refresh_epoch
    }

    public(package) fun staking_pool_id(self: &ValidatorInfo): ID {
        self.staking_pool_id
    }

    public(package) fun validator_address(self: &ValidatorInfo): address {
        self.validator_address
    }

    public(package) fun active_stake(self: &ValidatorInfo): &Option<FungibleStakedSui> {
        &self.active_stake
    }

    public(package) fun inactive_stake(self: &ValidatorInfo): &Option<StakedSui> {
        &self.inactive_stake
    }

    public(package) fun exchange_rate(self: &ValidatorInfo): &PoolTokenExchangeRate {
        &self.exchange_rate
    }

    public(package) fun total_sui_amount(self: &ValidatorInfo): u64 {
        self.total_sui_amount
    }

    public(package) fun find_validator_index_by_address(self: &Storage, validator_address: address): u64 {
        let mut i = 0;
        while (i < self.validator_infos.length()) {
            if (self.validator_infos[i].validator_address == validator_address) {
                return i
            };

            i = i + 1;
        };

        i
    }

    fun is_empty(self: &ValidatorInfo): bool {
        self.active_stake.is_none() && self.inactive_stake.is_none() && self.total_sui_amount == 0
    }

    /* Refresh Functions */

    /// Idempotent function that:
    /// - Updates the exchange rate for all validators.
    /// - Moves any inactive stake that can be converted to active stake.
    /// - Removes validators that have no stake.
    /// Returns true if the storage was updated.
    public(package) fun refresh(
        self: &mut Storage, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {

        if (self.last_refresh_epoch == ctx.epoch()) {
            return false
        };

        let active_validator_addresses = system_state.active_validator_addresses();

        let mut i = self.validator_infos.length();
        while (i > 0) {
            i = i - 1;

            // if validator is inactive, withdraw all stake.
            // TODO: replace with system_state.is_active_staking_pool once it's live.
            if (!active_validator_addresses.contains(&self.validator_infos[i].validator_address)) {
                // technically this is using a stale exchange rate, but it doesn't matter because we're unstaking everything.
                // this is done before fetching the exchange rate because i don't want the function to abort if an epoch is skipped.
                self.unstake_approx_n_sui_from_validator(system_state, i, MAX_SUI_SUPPLY, ctx);
            };

            if (self.validator_infos[i].is_empty()) {
                let ValidatorInfo { active_stake, inactive_stake, extra_fields, .. } = self.validator_infos.remove(i);
                active_stake.destroy_none();
                inactive_stake.destroy_none();
                extra_fields.destroy_empty();

                continue
            };

            // update pool token exchange rates
            let latest_exchange_rate_opt = self.get_latest_exchange_rate(
                &self.validator_infos[i].staking_pool_id,
                system_state,
                ctx
            );

            if (latest_exchange_rate_opt.is_some()) {
                self.validator_infos[i].exchange_rate = *latest_exchange_rate_opt.borrow();
            };

            self.refresh_validator_info(i);

            if (self.validator_infos[i].inactive_stake.is_some()) {
                let inactive_stake = self.take_from_inactive_stake(i);
                let fungible_staked_sui = system_state.convert_to_fungible_staked_sui(inactive_stake, ctx);
                self.join_fungible_staked_sui_to_validator(i, fungible_staked_sui);
            };

        };

        self.last_refresh_epoch = ctx.epoch();
        true
    }

    // finds the latest exchange rate by searching backwards from current epoch 
    // to the storage's last refresh epoch.
    // this may return none in the case where the staking pool is inactive or 
    // if sui system is currently in safe mode. In both these cases, the storage
    // object has the latest exchange rate already.
    fun get_latest_exchange_rate(
        self: &Storage,
        staking_pool_id: &ID,
        system_state: &mut SuiSystemState,
        ctx: &TxContext
    ): Option<PoolTokenExchangeRate> {
        let exchange_rates = system_state.pool_exchange_rates(staking_pool_id);

        let mut cur_epoch = ctx.epoch();
        while (cur_epoch > self.last_refresh_epoch) {
            if (exchange_rates.contains(cur_epoch)) {
                return option::some(*exchange_rates.borrow(cur_epoch))
            };

            cur_epoch = cur_epoch - 1;
        };

        option::none()
    }

    /// Update the total sui amount for the validator and modify the 
    /// storage sui supply accordingly assumes the exchange rate is up to date
    fun refresh_validator_info(self: &mut Storage, i: u64) {
        let validator_info = &mut self.validator_infos[i];
        self.total_sui_supply = self.total_sui_supply - validator_info.total_sui_amount;

        let mut total_sui_amount = 0;
        if (validator_info.active_stake.is_some()) {
            let active_stake = validator_info.active_stake.borrow();
            let active_sui_amount = get_sui_amount(
                &validator_info.exchange_rate, 
                active_stake.value()
            );

            total_sui_amount = total_sui_amount + active_sui_amount;
        };

        if (validator_info.inactive_stake.is_some()) {
            let inactive_stake = validator_info.inactive_stake.borrow();
            let inactive_sui_amount = inactive_stake.staked_sui_amount();

            total_sui_amount = total_sui_amount + inactive_sui_amount;
        };

        validator_info.total_sui_amount = total_sui_amount;
        self.total_sui_supply = self.total_sui_supply + total_sui_amount;
    }

    // the higher the validator index, the lower the priority. In this case, low priority means it'll
    // process unstake requests first
    public(package) fun change_validator_priority(
        self: &mut Storage, 
        validator_index: u64, 
        new_validator_index: u64
    ) {
        if (validator_index == new_validator_index) {
            return
        };

        let validator_info = self.validator_infos.remove(validator_index);
        self.validator_infos.insert(validator_info, new_validator_index);
    }


    /* Join Functions */
    public(package) fun join_to_sui_pool(self: &mut Storage, sui: Balance<SUI>) {
        self.total_sui_supply = self.total_sui_supply + sui.value();
        self.sui_pool.join(sui);
    }

    public(package) fun join_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        stake: StakedSui, 
        ctx: &mut TxContext
    ) {
        let validator_index = self.get_or_add_validator_index_by_staking_pool_id_mut(
            system_state, 
            stake.pool_id(), 
            ctx
        );

        if (stake.stake_activation_epoch() <= ctx.epoch()) {
            let fungible_staked_sui = system_state.convert_to_fungible_staked_sui(stake, ctx);
            self.join_fungible_staked_sui_to_validator(validator_index, fungible_staked_sui);
        } else {
            self.join_inactive_stake_to_validator(validator_index, stake);
        };
    }

    public(package) fun join_fungible_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        fungible_staked_sui: FungibleStakedSui,
        ctx: &mut TxContext
    ) {
        let validator_index = self.get_or_add_validator_index_by_staking_pool_id_mut(
            system_state, 
            fungible_staked_sui.pool_id(), 
            ctx
        );

        self.join_fungible_staked_sui_to_validator(validator_index, fungible_staked_sui);
    }

    fun join_inactive_stake_to_validator(
        self: &mut Storage, 
        validator_index: u64,
        stake: StakedSui,
    ) {
        let validator_info = &mut self.validator_infos[validator_index];

        if (validator_info.inactive_stake.is_some()) {
            validator_info.inactive_stake.borrow_mut().join(stake);
        } else {
            validator_info.inactive_stake.fill(stake);
        };

        self.refresh_validator_info(validator_index);
    }

    fun join_fungible_staked_sui_to_validator(
        self: &mut Storage, 
        validator_index: u64,
        fungible_staked_sui: FungibleStakedSui,
    ) {
        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.active_stake.is_some()) {
            validator_info.active_stake.borrow_mut().join_fungible_staked_sui(fungible_staked_sui);

        } else {
            validator_info.active_stake.fill(fungible_staked_sui);
        };

        self.refresh_validator_info(validator_index);
    }

    /* Split/Take Functions */
    public(package) fun split_up_to_n_sui_from_sui_pool(
        self: &mut Storage, 
        max_sui_amount_out: u64
    ): Balance<SUI> {
        let sui_amount_out = min(self.sui_pool.value(), max_sui_amount_out);
        self.split_from_sui_pool(sui_amount_out)
    }

    fun split_from_sui_pool(self: &mut Storage, amount: u64): Balance<SUI> {
        self.total_sui_supply = self.total_sui_supply - amount;
        self.sui_pool.split(amount)
    }

    public(package) fun unstake_approx_n_sui_from_validator(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        let mut amount = self.unstake_approx_n_sui_from_inactive_stake(system_state, validator_index, unstake_sui_amount, ctx);
        if (unstake_sui_amount > amount) {
            amount = amount + self.unstake_approx_n_sui_from_active_stake(system_state, validator_index, unstake_sui_amount - amount, ctx);
        };

        amount
    }

    // This function tries to unstake approximately n SUI. 
    // the output amount should be bounded from [0, n + 1 * MIST_PER_SUI * pool_token_ratio)
    public(package) fun unstake_approx_n_sui_from_active_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        if (target_unstake_sui_amount == 0) {
            return 0
        };

        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.active_stake.is_none()) {
            return 0
        };

        let target_unstake_sui_amount = max(target_unstake_sui_amount, MIN_STAKE_THRESHOLD);

        let fungible_staked_sui_amount = validator_info.active_stake.borrow().value();
        let total_sui_amount = get_sui_amount(
            &validator_info.exchange_rate, 
            fungible_staked_sui_amount 
        );

        let unstaked_sui = if (total_sui_amount <= target_unstake_sui_amount) {
            self.take_active_stake(system_state, validator_index, ctx)
        } 
        else {
            // ceil(target_unstake_sui_amount * fungible_staked_sui_amount / total_sui_amount)
            let split_amount = (
                ((target_unstake_sui_amount as u128)
                    * (fungible_staked_sui_amount as u128)
                    + (total_sui_amount as u128)
                    - 1)
                / (total_sui_amount as u128)
            ) as u64;

            self.split_from_active_stake(system_state, validator_index, split_amount as u64, ctx)
        };

        let unstaked_sui_amount = unstaked_sui.value();
        self.join_to_sui_pool(unstaked_sui);

        unstaked_sui_amount
    }

    // The output should be bounded from [0, n + 1 * MIST_PER_SUI) Sui
    public(package) fun unstake_approx_n_sui_from_inactive_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        if (target_unstake_sui_amount == 0) {
            return 0
        };

        let validator_info = &mut self.validator_infos[validator_index];
        if (validator_info.inactive_stake.is_none()) {
            return 0
        };

        let target_unstake_sui_amount = max(target_unstake_sui_amount, MIN_STAKE_THRESHOLD);

        let staked_sui_amount = validator_info.inactive_stake.borrow().staked_sui_amount();
        let staked_sui = if (staked_sui_amount < target_unstake_sui_amount + MIN_STAKE_THRESHOLD) {
            self.take_from_inactive_stake(validator_index)
        } 
        else {
            self.split_from_inactive_stake(validator_index, target_unstake_sui_amount, ctx)
        };

        let unstaked_sui = system_state.request_withdraw_stake_non_entry(staked_sui, ctx);
        let unstaked_sui_amount = unstaked_sui.value();
        self.join_to_sui_pool(unstaked_sui);

        unstaked_sui_amount
    }

    // This function approximately unstakes n SUI from validators, then returns up to n SUI.
    public(package) fun split_n_sui(
        self: &mut Storage,
        system_state: &mut SuiSystemState,
        max_sui_amount_out: u64,
        ctx: &mut TxContext
    ): Balance<SUI> {
        {
            let mut i = self.validators().length();
            while (i > 0 && self.sui_pool.value() < max_sui_amount_out) {
                i = i - 1;

                let sui_pool_value = self.sui_pool.value();
                self.unstake_approx_n_sui_from_inactive_stake(
                    system_state,
                    i,
                    max_sui_amount_out - sui_pool_value,
                    ctx
                );
            };
        };

        {
            let mut i = self.validators().length();
            while (i > 0 && self.sui_pool.value() < max_sui_amount_out) {
                i = i - 1;

                let sui_pool_value = self.sui_pool.value();
                self.unstake_approx_n_sui_from_active_stake(
                    system_state,
                    i,
                    // unstake a bit more than required. 
                    // this is to account for the fact that redeeming active stake
                    // will sometimes result in less sui than expected (roughly 2 mist)
                    max_sui_amount_out - sui_pool_value + ACTIVE_STAKE_REDEEM_OFFSET,
                    ctx
                );
            };
        };

        assert!(self.sui_pool.value() >= max_sui_amount_out, ENotEnoughSuiInSuiPool);
        self.split_from_sui_pool(max_sui_amount_out)
    }

    /* all split/unstake/take functions are built using the following 4 functions */
    fun split_from_active_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        fungible_staked_sui_amount: u64,
        ctx: &mut TxContext
    ): Balance<SUI> {
        let validator_info = &mut self.validator_infos[validator_index];

        let stake = validator_info.active_stake
            .borrow_mut()
            .split_fungible_staked_sui(fungible_staked_sui_amount, ctx);

        self.refresh_validator_info(validator_index);

        system_state.redeem_fungible_staked_sui(stake, ctx)
    }

    fun take_active_stake(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        validator_index: u64, 
        ctx: &TxContext
    ): Balance<SUI> {
        let validator_info = &mut self.validator_infos[validator_index];
        let fungible_staked_sui = validator_info.active_stake.extract();

        self.refresh_validator_info(validator_index);

        system_state.redeem_fungible_staked_sui(fungible_staked_sui, ctx)
    }

    fun split_from_inactive_stake(
        self: &mut Storage, 
        validator_index: u64, 
        sui_amount_out: u64,
        ctx: &mut TxContext
    ): StakedSui {
        let validator_info = &mut self.validator_infos[validator_index];
        let stake = validator_info.inactive_stake
            .borrow_mut()
            .split(sui_amount_out, ctx);

        self.refresh_validator_info(validator_index);

        stake
    }

    fun take_from_inactive_stake(
        self: &mut Storage, 
        validator_index: u64, 
    ): StakedSui {
        let validator_info = &mut self.validator_infos[validator_index];
        let stake = validator_info.inactive_stake.extract();

        self.refresh_validator_info(validator_index);

        stake
    }

    /* Private functions */
    fun get_or_add_validator_index_by_staking_pool_id_mut(
        self: &mut Storage, 
        system_state: &mut SuiSystemState,
        staking_pool_id: ID,
        ctx: &mut TxContext
    ): u64 {
        let mut current_validator_addresses = vector[];

        let mut i = 0;
        while (i < self.validator_infos.length()) {
            if (self.validator_infos[i].staking_pool_id == staking_pool_id) {
                return i
            };

            current_validator_addresses.push_back(self.validator_infos[i].validator_address);
            i = i + 1;
        };

        let validator_address = system_state.validator_address_by_pool_id(&staking_pool_id);

        assert!(
            !current_validator_addresses.contains(&validator_address),
            EValidatorAlreadyExists
        );

        let active_validator_addresses = system_state.active_validator_addresses();
        assert!(
            active_validator_addresses.contains(&validator_address),
            ENotActiveValidator
        );

        let exchange_rates = system_state.pool_exchange_rates(&staking_pool_id);
        let latest_exchange_rate = exchange_rates.borrow(ctx.epoch());

        self.validator_infos.push_back(ValidatorInfo {
            staking_pool_id: copy staking_pool_id,
            validator_address,
            active_stake: option::none(),
            inactive_stake: option::none(),
            exchange_rate: *latest_exchange_rate,
            total_sui_amount: 0,
            extra_fields: bag::new(ctx)
        });

        assert!(self.validator_infos.length() <= MAX_VALIDATORS, ETooManyValidators);

        i
    }

    /// copied directly from staking_pool.move
    fun get_sui_amount(exchange_rate: &PoolTokenExchangeRate, token_amount: u64): u64 {
        // When either amount is 0, that means we have no stakes with this pool.
        // The other amount might be non-zero when there's dust left in the pool.
        if (exchange_rate.sui_amount() == 0 || exchange_rate.pool_token_amount() == 0) {
            return token_amount
        };
        let res = (exchange_rate.sui_amount() as u128)
                * (token_amount as u128)
                / (exchange_rate.pool_token_amount() as u128);
        res as u64
    }

}
