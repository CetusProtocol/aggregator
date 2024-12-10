/// This module allows for the dynamic rebalancing of validator stakes based 
/// on a set of validator addresses and weights. Rebalance can be called permissionlessly
module liquid_staking::weight {
    use sui_system::sui_system::{SuiSystemState};
    use liquid_staking::liquid_staking::{LiquidStakingInfo, AdminCap};
    use liquid_staking::fees::{FeeConfig};
    use sui::vec_map::{Self, VecMap};
    use sui::bag::{Self, Bag};
    use liquid_staking::version::{Self, Version};
    use sui::package;
    use sui::coin::Coin;
    use sui::sui::SUI;

    /* Constants */
    const CURRENT_VERSION: u16 = 1;

    public struct WeightHook<phantom P> has key, store {
        id: UID,
        validator_addresses_and_weights: VecMap<address, u64>,
        total_weight: u64,
        admin_cap: AdminCap<P>,
        version: Version,
        extra_fields: Bag
    }

    public struct WeightHookAdminCap<phantom P> has key, store {
        id: UID
    }

    public struct WEIGHT has drop {}

    fun init(otw: WEIGHT, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx)
    }

    public fun new<P>(
        admin_cap: AdminCap<P>,
        ctx: &mut TxContext
    ): (WeightHook<P>, WeightHookAdminCap<P>) {
        (
            WeightHook {
                id: object::new(ctx),
                validator_addresses_and_weights: vec_map::empty(),
                total_weight: 0,
                admin_cap,
                version: version::new(CURRENT_VERSION),
                extra_fields: bag::new(ctx)
            },
            WeightHookAdminCap { id: object::new(ctx) }
        )
    }

    public fun set_validator_addresses_and_weights<P>(
        self: &mut WeightHook<P>,
        _: &WeightHookAdminCap<P>,
        validator_addresses_and_weights: VecMap<address, u64>,
    ) {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);
        self.validator_addresses_and_weights = validator_addresses_and_weights;

        let mut total_weight = 0;
        self.validator_addresses_and_weights.keys().length().do!(|i| {
            let (_, weight) = self.validator_addresses_and_weights.get_entry_by_idx(i);
            total_weight = total_weight + *weight;
        });

        self.total_weight = total_weight;
    }

    public fun update_fees<P>(
        self: &mut WeightHook<P>,
        _: &WeightHookAdminCap<P>,
        liquid_staking_info: &mut LiquidStakingInfo<P>,
        fee_config: FeeConfig,
    ) {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        liquid_staking_info.update_fees(&self.admin_cap, fee_config);
    }

    public fun collect_fees<P>(
        self: &mut WeightHook<P>,
        _: &WeightHookAdminCap<P>,
        liquid_staking_info: &mut LiquidStakingInfo<P>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        liquid_staking_info.collect_fees(system_state, &self.admin_cap, ctx)
    }

    public fun rebalance<P>(
        self: &mut WeightHook<P>,
        system_state: &mut SuiSystemState,
        liquid_staking_info: &mut LiquidStakingInfo<P>,
        ctx: &mut TxContext
    ) {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);
        if (self.total_weight == 0) {
            return
        };

        liquid_staking_info.refresh(system_state, ctx);

        let mut validator_addresses_and_weights = self.validator_addresses_and_weights;

        // 1. add all validators that exist in lst_info.validators() to the validator_address_to_weight map if they don't already exist
        liquid_staking_info.storage().validators().do_ref!(|validator| {
            let validator_address = validator.validator_address();
            if (!validator_addresses_and_weights.contains(&validator_address)) {
                validator_addresses_and_weights.insert(validator_address, 0);
            };
        });

        // 2. calculate current and target amounts of sui for each validator
        let (validator_addresses, validator_weights) = validator_addresses_and_weights.into_keys_values();

        let total_sui_supply = liquid_staking_info.storage().total_sui_supply(); // we want to allocate the unaccrued spread fees as well

        let validator_target_amounts  = validator_weights.map!(|weight| {
            ((total_sui_supply as u128) * (weight as u128) / (self.total_weight as u128)) as u64
        });

        let validator_current_amounts = validator_addresses.map_ref!(|validator_address| {
            let validator_index = liquid_staking_info.storage().find_validator_index_by_address(*validator_address);
            if (validator_index >= liquid_staking_info.storage().validators().length()) {
                return 0
            };

            let validator = liquid_staking_info.storage().validators().borrow(validator_index);
            validator.total_sui_amount()
        });

        // 3. decrease the stake for validators that have more stake than the target amount
        validator_addresses.length().do!(|i| {
            if (validator_current_amounts[i] > validator_target_amounts[i]) {
                liquid_staking_info.decrease_validator_stake(
                    &self.admin_cap,
                    system_state,
                    validator_addresses[i],
                    validator_current_amounts[i] - validator_target_amounts[i],
                    ctx
                );
            };
        });

        // 4. increase the stake for validators that have less stake than the target amount
        validator_addresses.length().do!(|i| {
            if (validator_current_amounts[i] < validator_target_amounts[i]) {
                liquid_staking_info.increase_validator_stake(
                    &self.admin_cap,
                    system_state,
                    validator_addresses[i],
                    validator_target_amounts[i] - validator_current_amounts[i],
                    ctx
                );
            };
        });
    }

    public fun eject<P>(
        mut self: WeightHook<P>,
        admin_cap: WeightHookAdminCap<P>,
    ): AdminCap<P> {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        let WeightHookAdminCap { id } = admin_cap;
        object::delete(id);

        let WeightHook { id, admin_cap, extra_fields, .. } = self;
        extra_fields.destroy_empty();
        object::delete(id);

        admin_cap
    }

    public fun admin_cap<P>(
        self: &WeightHook<P>, 
        _: &WeightHookAdminCap<P>
    ): &AdminCap<P> {
        self.version.assert_version(CURRENT_VERSION);

        &self.admin_cap
    }
}
