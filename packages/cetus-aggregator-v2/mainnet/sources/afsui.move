module cetus_aggregator::afsui {

    use std::type_name;
    use std::type_name::TypeName;
    use sui::coin;
    use sui::coin::{Coin, TreasuryCap};
    use sui::event;
    use sui::sui::SUI;
    use afsui::staked_sui_vault::{request_stake, StakedSuiVault};
    use safe::safe::Safe;
    use staking_afsui::afsui::AFSUI;
    use staking_refer::referral_vault::ReferralVault;
    use sui_system::sui_system::SuiSystemState;


    public struct AfsuiSwapEvent has copy, store, drop {
        amount_in: u64,
        amount_out: u64,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    /// StakedSuiVault: 0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d
    /// Safe: 0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610
    /// SuiSystemState: 0x3
    /// ReferralVault: 0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef
    /// address: 
    public fun swap_a2b(
        vault: &mut StakedSuiVault,
        safe: &mut Safe<TreasuryCap<AFSUI>>,
        sui_system: &mut SuiSystemState,
        refer: &ReferralVault,
        addr: address,
        coin_input: Coin<SUI>,
        ctx: &mut TxContext,
    ): Coin<AFSUI> {
        let amount_in = coin::value(&coin_input);
        let r = request_stake(vault, safe, sui_system, refer, coin_input, addr, ctx);
        let amount_out = coin::value(&r);
        event::emit(AfsuiSwapEvent {
            amount_in,
            amount_out,
            coin_a: type_name::get<SUI>(),
            coin_b: type_name::get<AFSUI>()
        });
        r
    }
}