module hasui::staking {

    use sui::balance::Balance;
    use sui::coin::{Coin, TreasuryCap};
    use sui::object::UID;
    use sui::sui::SUI;
    use sui::table::Table;
    use sui::tx_context::TxContext;
    use sui::vec_map::VecMap;
    use hasui::table_queue::TableQueue;
    use sui_system::staking_pool::StakedSui;
    use hasui::config::StakingConfig;
    use hasui::vault::Vault;
    use sui_system::sui_system::SuiSystemState;
    use hasui::hasui::HASUI;

    #[allow(unused_field)]
    struct PoolInfo has store {
        staked_suis: TableQueue<StakedSui>,
        total_staked: u64,
        rewards: u64
    }

    #[allow(unused_field)]
    struct EpochClaim has store {
        epoch: u64,
        amount: u64,
        approved: bool
    }

    #[allow(unused_field)]
    struct Staking has key {
        id: UID,
        version: u64,
        config: StakingConfig,
        sui_vault: Vault<SUI>,
        claim_sui_vault: Vault<SUI>,
        protocol_sui_vault: Vault<SUI>,
        service_sui_vault: Vault<SUI>,
        stsui_treasury_cap: TreasuryCap<HASUI>,
        unstake_epochs: vector<EpochClaim>,
        total_staked: u64,
        total_unstaked: u64,
        total_rewards: u64,
        total_protocol_fees: u64,
        uncollected_protocol_fees: u64,
        stsui_supply: u64,
        unclaimed_sui_amount: u64,
        pause_stake: bool,
        pause_unstake: bool,
        validators: vector<address>,
        pools: Table<address, PoolInfo>,
        user_selected_validator_bals: VecMap<address, Balance<SUI>>,
        rewards_last_updated_epoch: u64
    }

    public fun request_stake_coin(
        _rg0: &mut SuiSystemState,
        _rg1: &mut Staking,
        _rg2: Coin<SUI>,
        _rg3: address,
        _rg4: &mut TxContext
    ): Coin<HASUI> {
        abort 1
    }
}
