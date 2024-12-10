/// Module: liquid_staking
module liquid_staking::liquid_staking {
    use sui::balance::{Self, Balance};
    use sui_system::sui_system::{SuiSystemState};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use liquid_staking::storage::{Self, Storage};
    use sui::bag::{Self, Bag};
    use liquid_staking::fees::{FeeConfig};
    use liquid_staking::cell::{Self, Cell};
    use sui::coin::{TreasuryCap};
    use liquid_staking::version::{Self, Version};
    use liquid_staking::events::{emit_event};
    use sui_system::staking_pool::{FungibleStakedSui};
    use std::type_name::{Self, TypeName};
    use sui::package;

    /* Errors */
    const EInvalidLstCreation: u64 = 0;
    const EMintInvariantViolated: u64 = 1;
    const ERedeemInvariantViolated: u64 = 2;
    const EValidatorNotFound: u64 = 3;
    const EZeroLstSupply: u64 = 4;
    const EZeroLstMinted: u64 = 5;

    /* Constants */
    const CURRENT_VERSION: u16 = 1;
    const MIN_STAKE_AMOUNT: u64 = 1_000_000_000;

    public struct LIQUID_STAKING has drop {}

    public struct LiquidStakingInfo<phantom P> has key, store {
        id: UID,
        lst_treasury_cap: TreasuryCap<P>,
        fee_config: Cell<FeeConfig>,
        fees: Balance<SUI>,
        accrued_spread_fees: u64,
        storage: Storage,
        version: Version,
        extra_fields: Bag
    }

    public struct AdminCap<phantom P> has key, store { 
        id: UID
    }

    /* Events */
    public struct CreateEvent has copy, drop {
        typename: TypeName,
        liquid_staking_info_id: ID
    }

    public struct MintEvent has copy, drop {
        typename: TypeName,
        sui_amount_in: u64,
        lst_amount_out: u64,
        fee_amount: u64
    }

    public struct RedeemEvent has copy, drop {
        typename: TypeName,
        lst_amount_in: u64,
        sui_amount_out: u64,
        fee_amount: u64
    }

    public struct DecreaseValidatorStakeEvent has copy, drop {
        typename: TypeName,
        staking_pool_id: ID,
        amount: u64
    }

    public struct IncreaseValidatorStakeEvent has copy, drop {
        typename: TypeName,
        staking_pool_id: ID,
        amount: u64
    }

    public struct CollectFeesEvent has copy, drop {
        typename: TypeName,
        amount: u64
    }

    public struct EpochChangedEvent has copy, drop {
        typename: TypeName,
        old_sui_supply: u64,
        new_sui_supply: u64,
        lst_supply: u64,
        spread_fee: u64
    }

    /* Public View Functions */

    // returns total sui managed by the LST. Note that this value might be out of date if the 
    // LiquidStakingInfo object is out of date.
    public fun total_sui_supply<P>(self: &LiquidStakingInfo<P>): u64 {
        self.storage.total_sui_supply() - self.accrued_spread_fees
    }

    public fun total_lst_supply<P>(self: &LiquidStakingInfo<P>): u64 {
        self.lst_treasury_cap.total_supply()
    }

    public fun storage<P>(self: &LiquidStakingInfo<P>): &Storage {
        &self.storage
    }

    public fun fees<P>(self: &LiquidStakingInfo<P>): u64 {
        self.fees.value() + self.accrued_spread_fees
    }

    public fun fee_config<P>(self: &LiquidStakingInfo<P>): &FeeConfig {
        self.fee_config.get()
    }

    #[test_only]
    public fun accrued_spread_fees<P>(self: &LiquidStakingInfo<P>): u64 {
        self.accrued_spread_fees
    }

    /* Public Mutative Functions */
    fun init(otw: LIQUID_STAKING, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx)
    }

    public fun create_lst<P: drop>(
        fee_config: FeeConfig, 
        lst_treasury_cap: TreasuryCap<P>,
        ctx: &mut TxContext
    ): (AdminCap<P>, LiquidStakingInfo<P>) {
        assert!(lst_treasury_cap.total_supply() == 0, EInvalidLstCreation);

        let storage = storage::new(ctx);
        create_lst_with_storage(
            fee_config,
            lst_treasury_cap,
            storage,
            ctx
        )
    }

    public fun create_lst_with_stake<P: drop>(
        system_state: &mut SuiSystemState, 
        fee_config: FeeConfig, 
        lst_treasury_cap: TreasuryCap<P>,
        mut fungible_staked_suis: vector<FungibleStakedSui>,
        sui: Coin<SUI>,
        ctx: &mut TxContext
    ): (AdminCap<P>, LiquidStakingInfo<P>) {
        let mut storage = storage::new(ctx);
        while (!fungible_staked_suis.is_empty()) {
            let fungible_staked_sui = fungible_staked_suis.pop_back();
            storage.join_fungible_stake(
                system_state,
                fungible_staked_sui,
                ctx
            );
        };

        vector::destroy_empty(fungible_staked_suis);
        storage.join_to_sui_pool(sui.into_balance());

        assert!(lst_treasury_cap.total_supply() > 0 && storage.total_sui_supply() > 0, EInvalidLstCreation);

        // make sure the lst ratio is in a sane range:
        let total_sui_supply = (storage.total_sui_supply() as u128);
        let total_lst_supply = (lst_treasury_cap.total_supply() as u128);
        assert!(
            (total_sui_supply >= total_lst_supply)
            && (total_sui_supply <= 2 * total_lst_supply), // total_sui_supply / total_lst_supply <= 2
            EInvalidLstCreation
        );

        create_lst_with_storage(
            fee_config,
            lst_treasury_cap,
            storage,
            ctx
        )
    }

    fun create_lst_with_storage<P: drop>(
        fee_config: FeeConfig, 
        lst_treasury_cap: TreasuryCap<P>,
        storage: Storage,
        ctx: &mut TxContext
    ): (AdminCap<P>, LiquidStakingInfo<P>) {
        let uid = object::new(ctx);

        emit_event(CreateEvent {
            typename: type_name::get<P>(),
            liquid_staking_info_id: uid.to_inner()
        });

        (
            AdminCap<P> { id: object::new(ctx) },
            LiquidStakingInfo {
                id: uid,
                lst_treasury_cap: lst_treasury_cap,
                fee_config: cell::new(fee_config),
                fees: balance::zero(),
                accrued_spread_fees: 0,
                storage,
                version: version::new(CURRENT_VERSION),
                extra_fields: bag::new(ctx)
            }
        )
    }

    // User operations
    public fun mint<P: drop>(
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        ctx: &mut TxContext
    ): Coin<P> {
        self.refresh(system_state, ctx);

        let old_sui_supply = (self.total_sui_supply() as u128);
        let old_lst_supply = (self.total_lst_supply() as u128);

        let mut sui_balance = sui.into_balance();
        let sui_amount_in = sui_balance.value();

        // deduct fees
        let mint_fee_amount = self.fee_config.get().calculate_mint_fee(sui_balance.value());
        self.fees.join(sui_balance.split(mint_fee_amount));
        
        let lst_mint_amount = self.sui_amount_to_lst_amount(sui_balance.value());
        assert!(lst_mint_amount > 0, EZeroLstMinted);

        emit_event(MintEvent {
            typename: type_name::get<P>(),
            sui_amount_in,
            lst_amount_out: lst_mint_amount,
            fee_amount: mint_fee_amount
        });

        let lst = self.lst_treasury_cap.mint(lst_mint_amount, ctx);

        // invariant: lst_out / sui_in <= old_lst_supply / old_sui_supply
        // -> lst_out * old_sui_supply <= sui_in * old_lst_supply
        assert!(
            ((lst.value() as u128) * old_sui_supply <= (sui_balance.value() as u128) * old_lst_supply)
            || (old_sui_supply > 0 && old_lst_supply == 0), // special case
            EMintInvariantViolated
        );

        self.storage.join_to_sui_pool(sui_balance);

        lst
    }

    public fun redeem<P: drop>(
        self: &mut LiquidStakingInfo<P>,
        lst: Coin<P>,
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): Coin<SUI> {
        self.refresh(system_state, ctx);

        let old_sui_supply = (self.total_sui_supply() as u128);
        let old_lst_supply = (self.total_lst_supply() as u128);

        let sui_amount_out = self.lst_amount_to_sui_amount(lst.value());
        let mut sui = self.storage.split_n_sui(system_state, sui_amount_out, ctx);

        // deduct fee
        let redeem_fee_amount = self.fee_config.get().calculate_redeem_fee(sui.value());
        self.fees.join(sui.split(redeem_fee_amount as u64));

        emit_event(RedeemEvent {
            typename: type_name::get<P>(),
            lst_amount_in: lst.value(),
            sui_amount_out: sui.value(),
            fee_amount: redeem_fee_amount
        });

        // invariant: sui_out / lst_in <= old_sui_supply / old_lst_supply
        // -> sui_out * old_lst_supply <= lst_in * old_sui_supply
        assert!(
            (sui.value() as u128) * old_lst_supply <= (lst.value() as u128) * old_sui_supply,
            ERedeemInvariantViolated
        );

        self.lst_treasury_cap.burn(lst);

        coin::from_balance(sui, ctx)
    }


    // Admin Functions
    public fun change_validator_priority<P>(
        self: &mut LiquidStakingInfo<P>,
        _: &AdminCap<P>,
        validator_index: u64,
        new_validator_index: u64
    ) {
        self.storage.change_validator_priority(validator_index, new_validator_index);
    }
        
    public fun increase_validator_stake<P>(
        self: &mut LiquidStakingInfo<P>,
        _: &AdminCap<P>,
        system_state: &mut SuiSystemState,
        validator_address: address,
        sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        self.refresh(system_state, ctx);

        let sui = self.storage.split_up_to_n_sui_from_sui_pool(sui_amount);
        if (sui.value() < MIN_STAKE_AMOUNT) {
            self.storage.join_to_sui_pool(sui);
            return 0
        };

        let staked_sui = system_state.request_add_stake_non_entry(
            coin::from_balance(sui, ctx),
            validator_address,
            ctx
        );
        let staked_sui_amount = staked_sui.staked_sui_amount();

        emit_event(IncreaseValidatorStakeEvent {
            typename: type_name::get<P>(),
            staking_pool_id: staked_sui.pool_id(),
            amount: staked_sui.staked_sui_amount()
        });

        self.storage.join_stake(system_state, staked_sui, ctx);

        staked_sui_amount
    }
    
    public fun decrease_validator_stake<P>(
        self: &mut LiquidStakingInfo<P>,
        _: &AdminCap<P>,
        system_state: &mut SuiSystemState,
        validator_address: address,
        target_unstake_sui_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        self.refresh(system_state, ctx);

        let validator_index = self.storage.find_validator_index_by_address(validator_address);
        assert!(validator_index < self.storage.validators().length(), EValidatorNotFound);

        let sui_amount = self.storage.unstake_approx_n_sui_from_validator(
            system_state,
            validator_index,
            target_unstake_sui_amount,
            ctx
        );

        emit_event(DecreaseValidatorStakeEvent {
            typename: type_name::get<P>(),
            staking_pool_id: self.storage.validators()[validator_index].staking_pool_id(),
            amount: sui_amount
        });

        sui_amount
    }

    public fun collect_fees<P>(
        self: &mut LiquidStakingInfo<P>,
        system_state: &mut SuiSystemState,
        _admin_cap: &AdminCap<P>,
        ctx: &mut TxContext
    ): Coin<SUI> {
        self.refresh(system_state, ctx);

        let spread_fees = self.storage.split_n_sui(system_state, self.accrued_spread_fees, ctx);
        self.accrued_spread_fees = self.accrued_spread_fees - spread_fees.value();

        let mut fees = self.fees.withdraw_all();
        fees.join(spread_fees);

        emit_event(CollectFeesEvent {
            typename: type_name::get<P>(),
            amount: fees.value()
        });

        coin::from_balance(fees, ctx)
    }

    public fun update_fees<P>(
        self: &mut LiquidStakingInfo<P>,
        _admin_cap: &AdminCap<P>,
        fee_config: FeeConfig,
    ) {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        let old_fee_config = self.fee_config.set(fee_config);
        old_fee_config.destroy();
    }

    // returns true if the object was refreshed
    public fun refresh<P>(
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        let old_total_supply = self.total_sui_supply();

        if (self.storage.refresh(system_state, ctx)) { // epoch rolled over
            let new_total_supply = self.total_sui_supply();

            // don't think we need to keep track of this in fixed point.
            // If there's 1 SUI staked, and the yearly rewards is 1%, then 
            // the spread fee in 1 epoch is 1 * 0.01 / 365 = 0.0000274 SUI => 27400 MIST
            // ie very unlikely to round spread fees to 0.
            let spread_fee = if (new_total_supply > old_total_supply) {
                (((new_total_supply - old_total_supply) as u128) 
                * (self.fee_config.get().spread_fee_bps() as u128) 
                / (10_000 as u128)) as u64
            } else {
                0
            };

            self.accrued_spread_fees = self.accrued_spread_fees + spread_fee;

            emit_event(EpochChangedEvent {
                typename: type_name::get<P>(),
                old_sui_supply: old_total_supply,
                new_sui_supply: new_total_supply,
                lst_supply: self.total_lst_supply(),
                spread_fee
            });

            return true
        };

        false
    }

    /* Private Functions */

    fun sui_amount_to_lst_amount<P>(
        self: &LiquidStakingInfo<P>, 
        sui_amount: u64
    ): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = self.total_lst_supply();

        if (total_sui_supply == 0 || total_lst_supply == 0) {
            return sui_amount
        };

        let lst_amount = (total_lst_supply as u128)
         * (sui_amount as u128)
         / (total_sui_supply as u128);

        lst_amount as u64
    }

    fun lst_amount_to_sui_amount<P>(
        self: &LiquidStakingInfo<P>, 
        lst_amount: u64
    ): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = self.total_lst_supply();

        assert!(total_lst_supply > 0, EZeroLstSupply);

        let sui_amount = (total_sui_supply as u128)
            * (lst_amount as u128) 
            / (total_lst_supply as u128);

        sui_amount as u64
    }
}
