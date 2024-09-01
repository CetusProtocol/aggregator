module afsui::staked_sui_vault {

    use safe::safe::Safe;
    use sui::coin::{Coin, TreasuryCap};
    use sui::object::UID;
    use sui::sui::SUI;
    use sui::tx_context::TxContext;
    use staking_afsui::afsui::AFSUI;
    use staking_refer::referral_vault::ReferralVault;
    use sui_system::sui_system::SuiSystemState;


    #[allow(unused_field)]
    struct StakedSuiVault has key {
        id: UID,
        version: u64
    }


    public fun request_stake(
        _rg0: &mut StakedSuiVault,
        _rg1: &mut Safe<TreasuryCap<AFSUI>>,
        _rg2: &mut SuiSystemState,
        _rg3: &ReferralVault,
        _rg4: Coin<SUI>,
        _rg5: address,
        _rg6: &mut TxContext): Coin<AFSUI>
    {
        abort 1
    }
}
