#[allow(unused_field)]
module kriya_clmm::trade;

use sui::object::ID;

public struct FlashSwapReceipt {
    pool_id: ID,
    amount_x_debt: u64,
    amount_y_debt: u64,
}
