// Interface for the mainnet v10 package used by CetusAggregatorV2ExtendV1.
#[allow(unused_field, unused_variable)]
module liquid_staking::liquid_staking;

use sui::coin::Coin;
use sui::sui::SUI;
use sui_system::sui_system::SuiSystemState;

public struct LiquidStakingInfo<phantom P> has key, store { id: UID }
public struct AdminCap<phantom P> has key, store { id: UID }

public fun mint<P: drop>(
    self: &mut LiquidStakingInfo<P>,
    system_state: &mut SuiSystemState,
    sui: Coin<SUI>,
    ctx: &mut TxContext,
): Coin<P> { abort 0 }

public fun redeem<P: drop>(
    self: &mut LiquidStakingInfo<P>,
    lst: Coin<P>,
    system_state: &mut SuiSystemState,
    ctx: &mut TxContext,
): Coin<SUI> { abort 0 }
