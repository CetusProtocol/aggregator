module cetus_aggregator::haedal {

    use std::type_name;
    use std::type_name::TypeName;
    use sui::coin;
    use sui::coin::Coin;
    use sui::event;
    use sui::sui::SUI;
    use hasui::hasui::HASUI;
    use hasui::staking::{request_stake_coin, Staking};
    use sui_system::sui_system::SuiSystemState;

    public struct HedalSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
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
        let r = request_stake_coin(sui_system, pool, coin_input, @0x0, ctx);
        let amount_out = coin::value<HASUI>(&r);
        event::emit(HedalSwapEvent {
            amount_out,
            amount_in,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<HASUI>()
        });
        r
    }
}