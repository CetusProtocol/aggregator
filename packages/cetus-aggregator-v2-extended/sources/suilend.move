module cetus_aggregator_v2::suilend {
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use sui::sui::SUI;
    use sui_system::sui_system::SuiSystemState;
    use std::type_name::{Self, TypeName};
    use liquid_staking::liquid_staking::{mint, redeem, LiquidStakingInfo};

    public struct SuilendSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    // mint spring_sui: sui -> spring_sui
    public fun swap_a2b<P: drop> (
        liquid_staking_info: &mut LiquidStakingInfo<P>,
        system_state: &mut SuiSystemState,
        sui_coin: Coin<SUI>,
        ctx: &mut TxContext,
    ): Coin<P> {
        let amount_in = coin::value(&sui_coin);
        let spring_sui = liquid_staking_info.mint(system_state, sui_coin, ctx);
        let amount_out = coin::value(&spring_sui);
        emit(SuilendSwapEvent {
            a2b: true,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<P>(),
        });
        spring_sui
    }

    // redeem spring_sui: spring_sui -> sui
    public fun swap_b2a<P: drop> (
        liquid_staking_info: &mut LiquidStakingInfo<P>,
        system_state: &mut SuiSystemState,
        spring_sui: Coin<P>,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let amount_in = coin::value(&spring_sui);
        let sui_coin = liquid_staking_info.redeem(spring_sui, system_state, ctx);
        let amount_out = coin::value(&sui_coin);
        emit(SuilendSwapEvent {
            a2b: false,
            by_amount_in: true,
            amount_in,
            amount_out,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<P>(),
        });
        sui_coin
    }
} 
