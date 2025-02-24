/// Stake unlent Sui.
module suilend::staker {
    use liquid_staking::fees;
    use liquid_staking::liquid_staking::{Self, LiquidStakingInfo, AdminCap};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, TreasuryCap};
    use sui::sui::SUI;
    use sui_system::sui_system::SuiSystemState;

    // errors
    const ETreasuryCapNonZeroSupply: u64 = 0;
    const EInvariantViolation: u64 = 1;

    // constants
    const U64_MAX: u64 = 18446744073709551615;
    const SUILEND_VALIDATOR: address =
        @0xce8e537664ba5d1d5a6a857b17bd142097138706281882be6805e17065ecde89;

    // This is mostly so i don't hit the "zero lst coin mint" error.
    const MIN_DEPLOY_AMOUNT: u64 = 1_000_000; // 1 SUI
    const MIST_PER_SUI: u64 = 1_000_000_000;

    public struct Staker<phantom P> has store {
        admin: AdminCap<P>,
        liquid_staking_info: LiquidStakingInfo<P>,
        lst_balance: Balance<P>,
        sui_balance: Balance<SUI>,
        liabilities: u64, // how much sui is owed to the reserve
    }

    /* Public-View Functions */
    public(package) fun liabilities<P>(staker: &Staker<P>): u64 {
        staker.liabilities
    }

    public(package) fun lst_balance<P>(staker: &Staker<P>): &Balance<P> {
        &staker.lst_balance
    }

    public(package) fun sui_balance<P>(staker: &Staker<P>): &Balance<SUI> {
        &staker.sui_balance
    }

    // this value can be stale if the staker hasn't refreshed the liquid_staking_info
    public(package) fun total_sui_supply<P>(staker: &Staker<P>): u64 {
        staker.liquid_staking_info.total_sui_supply() + staker.sui_balance.value()
    }

    public(package) fun liquid_staking_info<P>(staker: &Staker<P>): &LiquidStakingInfo<P> {
        &staker.liquid_staking_info
    }

    /* Public Mutative Functions */
    public(package) fun create_staker<P: drop>(
        treasury_cap: TreasuryCap<P>,
        ctx: &mut TxContext,
    ): Staker<P> {
        assert!(coin::total_supply(&treasury_cap) == 0, ETreasuryCapNonZeroSupply);

        let (admin_cap, liquid_staking_info) = liquid_staking::create_lst(
            fees::new_builder(ctx).to_fee_config(),
            treasury_cap,
            ctx,
        );

        Staker {
            admin: admin_cap,
            liquid_staking_info,
            lst_balance: balance::zero(),
            sui_balance: balance::zero(),
            liabilities: 0,
        }
    }

    public(package) fun deposit<P>(staker: &mut Staker<P>, sui: Balance<SUI>) {
        staker.liabilities = staker.liabilities + sui.value();
        staker.sui_balance.join(sui);
    }

    public(package) fun withdraw<P: drop>(
        staker: &mut Staker<P>,
        withdraw_amount: u64,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext,
    ): Balance<SUI> {
        staker.liquid_staking_info.refresh(system_state, ctx);

        if (withdraw_amount > staker.sui_balance.value()) {
            let unstake_amount = withdraw_amount - staker.sui_balance.value();
            staker.unstake_n_sui(system_state, unstake_amount, ctx);
        };

        let sui = staker.sui_balance.split(withdraw_amount);
        staker.liabilities = staker.liabilities - sui.value();

        sui
    }

    public(package) fun rebalance<P: drop>(
        staker: &mut Staker<P>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext,
    ) {
        staker.liquid_staking_info.refresh(system_state, ctx);

        if (staker.sui_balance.value() < MIN_DEPLOY_AMOUNT) {
            return
        };

        let sui = staker.sui_balance.withdraw_all();
        let lst = staker
            .liquid_staking_info
            .mint(
                system_state,
                coin::from_balance(sui, ctx),
                ctx,
            );
        staker.lst_balance.join(lst.into_balance());

        staker
            .liquid_staking_info
            .increase_validator_stake(
                &staker.admin,
                system_state,
                SUILEND_VALIDATOR,
                U64_MAX,
                ctx,
            );
    }

    public(package) fun claim_fees<P: drop>(
        staker: &mut Staker<P>,
        system_state: &mut SuiSystemState,
        ctx: &mut TxContext,
    ): Balance<SUI> {
        staker.liquid_staking_info.refresh(system_state, ctx);

        let total_sui_supply = staker.total_sui_supply();

        // leave 1 SUI extra, just in case
        let excess_sui = if (total_sui_supply > staker.liabilities + MIST_PER_SUI) {
            total_sui_supply - staker.liabilities - MIST_PER_SUI
        } else {
            0
        };

        if (excess_sui > staker.sui_balance.value()) {
            let unstake_amount = excess_sui - staker.sui_balance.value();
            staker.unstake_n_sui(system_state, unstake_amount, ctx);
        };

        let sui = staker.sui_balance.split(excess_sui);

        assert!(staker.total_sui_supply() >= staker.liabilities, EInvariantViolation);

        sui
    }

    /* Private Functions */

    // liquid_staking_info must be refreshed before calling this
    // this function can unstake slightly more sui than requested due to rounding.
    fun unstake_n_sui<P: drop>(
        staker: &mut Staker<P>,
        system_state: &mut SuiSystemState,
        sui_amount_out: u64,
        ctx: &mut TxContext,
    ) {
        if (sui_amount_out == 0) {
            return
        };

        let total_sui_supply = (staker.liquid_staking_info.total_sui_supply() as u128);
        let total_lst_supply = (staker.liquid_staking_info.total_lst_supply() as u128);

        // ceil lst redemption amount
        let lst_to_redeem =
            ((sui_amount_out as u128) * total_lst_supply + total_sui_supply - 1) / total_sui_supply;
        let lst = balance::split(&mut staker.lst_balance, (lst_to_redeem as u64));

        let sui = liquid_staking::redeem(
            &mut staker.liquid_staking_info,
            coin::from_balance(lst, ctx),
            system_state,
            ctx,
        );

        staker.sui_balance.join(sui.into_balance());
    }
}
