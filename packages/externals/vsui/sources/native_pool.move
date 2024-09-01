/// Module: vsui
module vsui::native_pool {

    use sui::coin::Coin;
    use sui::object::UID;
    use sui::sui::SUI;
    use sui::table::Table;
    use sui::tx_context::TxContext;
    use sui_system::sui_system::SuiSystemState;
    use sui_system::validator_set::ValidatorSet;
    use vsui::cert;
    use vsui::cert::CERT;
    use vsui::unstake_ticket::Metadata;

    #[allow(unused_field, lint(coin_field))]
    // #[allow(lint(coin_field))]
    struct NativePool has key {
        id: UID,
        pending: Coin<SUI>,
        collectable_fee: Coin<SUI>,
        validator_set: ValidatorSet,
        ticket_metadata: Metadata,
        total_staked: Table<u64, u64>,
        staked_update_epoch: u64,
        base_unstake_fee: u64,
        unstake_fee_threshold: u64,
        base_reward_fee: u64,
        version: u64,
        paused: bool,
        min_stake: u64,
        total_rewards: u64,
        collected_rewards: u64,
        rewards_threshold: u64,
        rewards_update_ts: u64
    }

    public fun stake_non_entry(
        _rg0: &mut NativePool,
        _rg1: &mut vsui::cert::Metadata<CERT>,
        _rg2: &mut SuiSystemState,
        _rg3: Coin<SUI>,
        _rg4: &mut TxContext
    ): Coin<CERT> {
        abort 1
    }

    public fun to_shares(_: &NativePool, _: &cert::Metadata<CERT>, _rg2: u64): u64 {
        abort 1
    }
}
