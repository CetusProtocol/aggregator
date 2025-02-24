module cetus_aggregator::haedal {
    use hasui::hasui::HASUI;
    use hasui::staking::{request_stake_coin, request_unstake_instant_coin, Staking};
    use std::type_name::{Self, TypeName};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;
    use sui_system::sui_system::SuiSystemState;

    public struct HedalSwapEvent has copy, drop, store {
        amount_in: u64,
        amount_out: u64,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    // a2b: true -> stake from SUI to HASUI
    // a2b: false -> unstake from HASUI to SUI
    // now haedak lsd support two direction swap, so we need to add a2b to the event
    public struct HaedalSwapEvent has copy, drop, store {
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b(
        pool: &mut Staking,
        sui_system: &mut SuiSystemState,
        coin_input: Coin<SUI>,
        ctx: &mut TxContext,
    ): Coin<HASUI> {
        let amount_in = coin::value(&coin_input);
        let hasui_coin = request_stake_coin(sui_system, pool, coin_input, @0x0, ctx);
        let amount_out = coin::value<HASUI>(&hasui_coin);
        event::emit(HaedalSwapEvent {
            amount_out,
            amount_in,
            a2b: true,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<HASUI>(),
        });
        hasui_coin
    }

    public fun swap_b2a(
        pool: &mut Staking,
        sui_system: &mut SuiSystemState,
        coin_input: Coin<HASUI>,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let amount_in = coin::value(&coin_input);
        let sui_coin = request_unstake_instant_coin(sui_system, pool, coin_input, ctx);
        let amount_out = coin::value(&sui_coin);
        event::emit(HaedalSwapEvent {
            amount_out,
            amount_in,
            a2b: false,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<HASUI>(),
        });
        sui_coin
    }
}
