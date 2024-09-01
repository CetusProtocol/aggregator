module kriya_clmm::trade {
    use kriya_clmm::{pool::Pool, version::Version};
    use sui::{object::ID, tx_context::TxContext, balance::Balance, clock::Clock};

    #[allow(unused_field)]
    struct FlashSwapReceipt {
        pool_id: ID,
        amount_x_debt: u64,
        amount_y_debt: u64,
    }
        
    public fun flash_swap<T0, T1>(
        _pool: &mut Pool<T0, T1>, 
        _a2b: bool, 
        _by_amount_in: bool, 
        _amount: u64, 
        _sqrt_price_limit: u128, 
        _clock: &Clock, 
        _version: &Version, 
        _ctx: &TxContext
    ) : (Balance<T0>, Balance<T1>, FlashSwapReceipt) {
        abort 0
    }

    public fun repay_flash_swap<T0, T1>(
        _pool: &mut Pool<T0, T1>, 
        _receipt: FlashSwapReceipt, 
        _balance_a: Balance<T0>, 
        _balance_b: Balance<T1>, 
        _version: &Version, 
        _ctx: &TxContext
    ) {
        abort 0
    }
}

