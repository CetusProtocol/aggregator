
/// Module: liquid_staking
module alphafi_liquid_staking::liquid_staking {
    use sui::balance::{Self, Balance};
    use sui_system::sui_system::{SuiSystemState};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use alphafi_liquid_staking::storage::{Self, Storage};
    use sui::bag::{Self, Bag};
    use alphafi_liquid_staking::fees::{FeeConfig};
    use alphafi_liquid_staking::cell::{Self, Cell};
    use sui::coin::{TreasuryCap};
    use alphafi_liquid_staking::version::{Self, Version};
    use alphafi_liquid_staking::events::{emit_event};
    use std::type_name::{Self, TypeName};
    use sui::package;
    use sui::vec_map::VecMap;

    /* Errors */
    const EInvalidLstCreation: u64 = 0;
    const EMintInvariantViolated: u64 = 1;
    const ERedeemInvariantViolated: u64 = 2;
    const EZeroLstSupply: u64 = 3;
    const EZeroLstMinted: u64 = 4;
    const EDisabledCollectionFeeCap: u64 = 5;
    const ESystemInPausedState: u64 = 6;
    const ESystemNotPaused: u64 = 7;

    /* Constants */
    const CURRENT_VERSION: u16 = 2;
    

    public struct LIQUID_STAKING has drop {}

    public struct LiquidStakingInfo<phantom P> has key, store {
        id: UID,
        lst_treasury_cap: TreasuryCap<P>,
        fee_config: Cell<FeeConfig>,
        fees: Balance<SUI>,
        accrued_spread_fees: u64,
        storage: Storage,
        flash_stake_lst: u64,
        collection_fee_cap_id: ID,
        is_paused: bool,
        version: Version,
        extra_fields: Bag
    }

    public struct AdminCap<phantom P> has key, store { 
        id: UID
    }

    public struct CollectionFeeCap<phantom P> has key, store { 
        id: UID
    }

    public struct FlashStake<phantom P> {
        sui_amount: u64,
        lst_amount: u64,
        fee: u64
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
        fee_amount: u64,
    }

    public struct FlashStakeEvent has copy, drop {
        typename: TypeName,
        sui_amount_in: u64,
        lst_amount_out: u64,
        fee_amount: u64,
    }

    public struct RedeemEvent has copy, drop {
        typename: TypeName,
        lst_amount_in: u64,
        sui_amount_out: u64,
        fee_amount: u64,
        fee_distributed: u64,
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

    /* Private view Functions */
    fun flash_stake_supply<P>(self: &LiquidStakingInfo<P>): u64 {
        self.flash_stake_lst
    }

    /* Private set function */
    fun flash_stake_supply_add<P>(
        self: &mut LiquidStakingInfo<P>,
        amount: u64
    ) {
        self.flash_stake_lst = self.flash_stake_lst + amount;
    }

        /* Private set function */
    fun flash_stake_supply_reduce<P>(
        self: &mut LiquidStakingInfo<P>,
        amount: u64
    ) {
        self.flash_stake_lst = self.flash_stake_lst - amount;
    }
    /* Public View Functions */

    // returns total sui managed by the LST. Note that this value might be out of date if the 
    // LiquidStakingInfo object is out of date.
    public fun total_sui_supply<P>(self: &LiquidStakingInfo<P>): u64 {
        if(self.storage.total_sui_supply() > self.accrued_spread_fees) {
            self.storage.total_sui_supply() - self.accrued_spread_fees
        } else {
            0
        }
    }

    public fun total_lst_supply<P>(self: &LiquidStakingInfo<P>): u64 {
        self.lst_treasury_cap.total_supply() - self.flash_stake_supply()
    }

    public (package) fun storage<P>(self: &LiquidStakingInfo<P>): &Storage {
        &self.storage
    }

    public fun fees<P>(self: &LiquidStakingInfo<P>): u64 {
        self.fees.value() + self.accrued_spread_fees
    }

    public fun fee_config<P>(self: &LiquidStakingInfo<P>): &FeeConfig {
        self.fee_config.get()
    }

    public fun lst_to_sui_redemption_price<P>(
        self: &LiquidStakingInfo<P>, 
        lst_amount: u64
    ): u64 {
        let sui_amount = self.lst_amount_to_sui_amount(lst_amount);

        let redeem_fee = self.fee_config.get().calculate_redeem_fee(sui_amount);
        
        sui_amount - redeem_fee

    }

    public fun sui_to_lst_mint_price<P>(
        self: &LiquidStakingInfo<P>, 
        sui_amount: u64
    ): u64 {
        let mint_fee = self.fee_config.get().calculate_mint_fee(sui_amount);

        let lst_amount = self.sui_amount_to_lst_amount(sui_amount-mint_fee);
        
        lst_amount
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
    ): (AdminCap<P>, CollectionFeeCap<P>,LiquidStakingInfo<P>) {
        assert!(lst_treasury_cap.total_supply() == 0, EInvalidLstCreation);

        let storage = storage::new(ctx);
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
    ): (AdminCap<P>, CollectionFeeCap<P>, LiquidStakingInfo<P>) {
        let uid = object::new(ctx);

        emit_event(CreateEvent {
            typename: type_name::get<P>(),
            liquid_staking_info_id: uid.to_inner()
        });

        fee_config.emit_fee_change_event<P>();

        let collect_fee_cap = CollectionFeeCap<P> {
                id: object::new(ctx)
        };

        let collect_cap_id = object::id(&collect_fee_cap);
        (
            AdminCap<P> { id: object::new(ctx) },
            collect_fee_cap,
            LiquidStakingInfo {
                id: uid,
                lst_treasury_cap: lst_treasury_cap,
                fee_config: cell::new(fee_config),
                fees: balance::zero(),
                accrued_spread_fees: 0,
                storage,
                flash_stake_lst: 0,
                collection_fee_cap_id: collect_cap_id,
                is_paused: false,
                version: version::new(CURRENT_VERSION),
                extra_fields: bag::new(ctx)
            }
        )
    }

    public fun set_validator_addresses_and_weights<P>(
        self: &mut LiquidStakingInfo<P>,
        validator_addresses_and_weights: VecMap<address, u64>,
        _admin_cap: &AdminCap<P>
    ) {
        self.storage.set_validator_addresses_and_weights(
            validator_addresses_and_weights
        );
    }

    public fun flash_stake_start<P: drop> (
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<P>, FlashStake<P>) {
        assert!(!self.is_paused(),ESystemInPausedState);

        self.refresh_no_entry<P>(system_state, ctx);
        // deduct fees
        let sui_mint_amount = self.lst_amount_to_sui_amount_round_up(amount);

        let flash_stake_fee_amount = self.fee_config.get().calculate_flash_stake_fee(sui_mint_amount);

        let lst = self.lst_treasury_cap.mint(amount, ctx);

        self.flash_stake_supply_add(amount);
        self.pause_no_entry();

        ( lst, FlashStake {
            sui_amount: sui_mint_amount,
            lst_amount: amount,
            fee: flash_stake_fee_amount
        })
    }

    public fun flash_stake_conclude<P: drop> (
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>,
        loan: FlashStake<P>,
        ctx: &mut TxContext
    ): Coin<SUI> {

        assert!(self.is_paused(),ESystemNotPaused);
        let FlashStake<P> {
            sui_amount: sui_amount,
            lst_amount: lst_amount,
            fee: fee
        } = loan;

        self.refresh_no_entry<P>(system_state, ctx);

        assert!(sui.balance().value() >= (sui_amount + fee));
        let mut sui_balance = sui.into_balance();
        // deduct fees
        self.fees.join(sui_balance.split(fee));

        self.flash_stake_supply_reduce<P>(lst_amount);
        let stake_balance = sui_balance.split(sui_amount);

        let stake_balance_value = stake_balance.value();

        self.storage.join_to_sui_pool(stake_balance);

        emit_event(FlashStakeEvent {
            typename: type_name::get<P>(),
            sui_amount_in: stake_balance_value,
            lst_amount_out: lst_amount,
            fee_amount: fee,
        });

        self.un_pause_no_entry();
        coin::from_balance(sui_balance,ctx)
    }



    // User operations
    public fun mint<P: drop>(
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        sui: Coin<SUI>, 
        ctx: &mut TxContext
    ): Coin<P> {

        assert!(!self.is_paused(),ESystemInPausedState);
        self.refresh_no_entry<P>(system_state, ctx);

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
            fee_amount: mint_fee_amount,
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
        assert!(!self.is_paused(),ESystemInPausedState);

        self.refresh_no_entry(system_state, ctx);

        let old_sui_supply = (self.total_sui_supply() as u128);
        let old_lst_supply = (self.total_lst_supply() as u128);

        let sui_amount_out = self.lst_amount_to_sui_amount(lst.value());
        let mut sui = self.storage.split_n_sui(system_state, sui_amount_out, ctx);

        // deduct fee
        let mut redeem_fee_amount = self.fee_config.get().calculate_redeem_fee(sui.value());
        let distribution_fee = 
            if(self.total_lst_supply<P>() == lst.value()) {
                0
            } else {
                self.fee_config.get().calculate_distribution_component_fee(redeem_fee_amount)
            };
        redeem_fee_amount = if(redeem_fee_amount > distribution_fee) {
                    redeem_fee_amount - distribution_fee
                    } else {
                        0
                    };

            self.fees.join(sui.split(redeem_fee_amount as u64));
            self.storage.join_to_sui_pool(sui.split(distribution_fee as u64));

        emit_event(RedeemEvent {
            typename: type_name::get<P>(),
            lst_amount_in: lst.value(),
            sui_amount_out: sui.value(),
            fee_amount: redeem_fee_amount,
            fee_distributed: distribution_fee,
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
    public fun collect_fees<P>(
        self: &mut LiquidStakingInfo<P>,
        system_state: &mut SuiSystemState,
        _collection_cap: &CollectionFeeCap<P>,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(self.collection_fee_cap_id == object::id(_collection_cap),EDisabledCollectionFeeCap);
        self.refresh_no_entry(system_state, ctx);

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
        fee_config.emit_fee_change_event<P>();
        let old_fee_config = self.fee_config.set(fee_config);
        old_fee_config.destroy();
    }

    public fun generate_new_collection_cap<P> (
        self: &mut LiquidStakingInfo<P>,
        _admin_cap: &AdminCap<P>,
        ctx: &mut TxContext
    ): CollectionFeeCap<P> {
        let collect_fee_cap = CollectionFeeCap<P> {
                id: object::new(ctx)
        };
        self.collection_fee_cap_id = object::id(&collect_fee_cap);
        collect_fee_cap
    }

    public fun is_paused<P>(
        self: &mut LiquidStakingInfo<P>,
    ): bool {
        self.is_paused
    }

    public entry fun refresh<P>(
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ) {
            self.refresh_no_entry<P>(system_state,ctx);
            self.storage.stake_pending_sui<P>(system_state,ctx);

    }

        
    // returns true if the object was refreshed
    public (package) fun refresh_no_entry<P>(
        self: &mut LiquidStakingInfo<P>, 
        system_state: &mut SuiSystemState, 
        ctx: &mut TxContext
    ): bool {
        self.version.assert_version_and_upgrade(CURRENT_VERSION);

        let old_total_supply = self.total_sui_supply();

        if (self.storage.refresh<P>(system_state, ctx)) { // epoch rolled over
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

    fun lst_amount_to_sui_amount_round_up<P>(
        self: &LiquidStakingInfo<P>, 
        lst_amount: u64
    ): u64 {
        let total_sui_supply = self.total_sui_supply();
        let total_lst_supply = self.total_lst_supply();

        assert!(total_lst_supply > 0, EZeroLstSupply);

        let sui_amount = (((total_sui_supply as u128)
            * (lst_amount as u128))+ (total_lst_supply as u128) - 1) 
            / (total_lst_supply as u128);

        sui_amount as u64
    }
    fun pause_no_entry<P>(
        self: &mut LiquidStakingInfo<P>,
    ) {
        self.is_paused = true;
    }

    fun un_pause_no_entry<P>(
        self: &mut LiquidStakingInfo<P>,
    ) {
        self.is_paused = false;
    }


    #[test_only]

    public struct ALPHAPOOL has drop {}
    public struct ALPHA has drop{}

    #[test]

    fun test_create_lst_info() {
        use sui::test_scenario;
        use alphafi_liquid_staking::fees;
        use sui::vec_map;
        use sui_system::governance_test_utils::{advance_epoch,set_up_sui_system_state};

        let user = @0xCAFE;
        let _fee_wallet = @0x1;
        let _airdrop_wallet = @0x2;
        let _team_wallet_address = @0x3;
        let _dust_wallet_address = @0x4;
        let _onhold_receipts_wallet_address = @0x5;



        let mut tc = test_scenario::begin(user);
        {
            
            init(LIQUID_STAKING{},tc.ctx());
            set_up_sui_system_state(vector[@0x1, @0x2, @0x3,@0xa0920b0776bf13ee51b009c97b85dbf48100ae1510623b9a767450e4a481a1e2,@0x9275c6e27c1ce98b08edb3d88e71880520aa114fbf3745d333252f7a47672882]);
            tc.ctx().increment_epoch_number();

        };
        tc.next_tx(user);
        {
            let mut fee_config_builder = fees::new_builder(tc.ctx());
		    fee_config_builder = fee_config_builder.set_sui_mint_fee_bps(10);
		    fee_config_builder = fee_config_builder.set_redeem_fee_bps(10);
		    fee_config_builder = fee_config_builder.set_spread_fee_bps(1000);
		    let fee_config = fees::to_fee_config(fee_config_builder);
            let treasury: coin::TreasuryCap<ALPHA> = coin::create_treasury_cap_for_testing<ALPHA>(tc.ctx());
            let (admin_cap, collection_cap, lst_info) = create_lst(fee_config, treasury,tc.ctx());
            transfer::public_transfer(admin_cap,tc.ctx().sender());
            transfer::public_transfer(collection_cap,tc.ctx().sender());
            transfer::public_share_object(lst_info);
        };
        
        tc.next_tx(user);
        {
            let mut lst_info = tc.take_shared<LiquidStakingInfo<ALPHA>>();
            let mut state = tc.take_shared<SuiSystemState>();
            let admin_cap = tc.take_from_sender<AdminCap<ALPHA>>();
            let mut val_weight= vec_map::empty<address,u64>();

		    //AlphaFi Validator
		    val_weight.insert(@0xa0920b0776bf13ee51b009c97b85dbf48100ae1510623b9a767450e4a481a1e2,90);

		    //Triton Validator
		    val_weight.insert(@0x9275c6e27c1ce98b08edb3d88e71880520aa114fbf3745d333252f7a47672882,10);

            lst_info.set_validator_addresses_and_weights(val_weight,&admin_cap);
		
            let sui = coin::mint_for_testing<SUI>(2_000_000_000,tc.ctx());
           // let state = system_state::get_sui_system_state();
            let lst_coin = lst_info.mint(&mut state,sui,tc.ctx());

            transfer::public_transfer(lst_coin,tc.ctx().sender());
            test_scenario::return_shared(lst_info);
            test_scenario::return_shared(state);
            tc.return_to_sender(admin_cap);
        };
        tc.next_tx(user);
        {
            let mut lst_info = tc.take_shared<LiquidStakingInfo<ALPHA>>();
            assert!(lst_info.lst_to_sui_redemption_price(1_000_000) == 999000);
            assert!(lst_info.lst_to_sui_redemption_price(1_000_000_123) == 999000122);
            assert!(lst_info.sui_to_lst_mint_price(1_000_000_000) == 999000000);
            assert!(lst_info.sui_to_lst_mint_price(1_000_000_123) == 999000122);
            test_scenario::return_shared(lst_info);
            
        };

        tc.end();
    }
}
