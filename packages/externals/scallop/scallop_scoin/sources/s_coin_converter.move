module scallop_scoin::s_coin_converter {
    use sui::{balance::{Self, Balance, Supply}, object::{Self, UID}, coin::{Self, Coin, CoinMetadata, TreasuryCap}, transfer};
    use sui::tx_context::TxContext;
    use protocol::reserve::MarketCoin;

    struct SCoinTreasury<phantom T0, phantom T1> has key {
        id: UID,
        s_coin_supply: Supply<T0>,
        market_coin_balance: Balance<MarketCoin<T1>>,
    }
    
    public fun burn_s_coin<T0, T1>(arg0: &mut SCoinTreasury<T0, T1>, arg1: Coin<T0>, arg2: &mut TxContext): Coin<MarketCoin<T1>> {
        let v = coin::value<T0>(&arg1);
        balance::decrease_supply<T0>(&mut arg0.s_coin_supply, coin::into_balance<T0>(arg1));
        coin::from_balance<MarketCoin<T1>>(balance::split<MarketCoin<T1>>(&mut arg0.market_coin_balance, v), arg2)
    }
    
    fun create_s_coin_treasury<T0, T1>(arg0: TreasuryCap<T0>, arg1: &CoinMetadata<T0>, arg2: &CoinMetadata<T1>, arg3: &mut TxContext) : SCoinTreasury<T0, T1> {
        let v0 = coin::treasury_into_supply<T0>(arg0);
        assert!(balance::supply_value<T0>(&v0) == 0, 401);
        assert!(coin::get_decimals<T0>(arg1) == coin::get_decimals<T1>(arg2), 402);
        SCoinTreasury<T0, T1>{
            id                  : object::new(arg3), 
            s_coin_supply       : v0, 
            market_coin_balance : balance::zero<MarketCoin<T1>>(),
        }
    }
    
    public fun init_s_coin_treasury<T0, T1>(arg0: TreasuryCap<T0>, arg1: &CoinMetadata<T0>, arg2: &CoinMetadata<T1>, arg3: &mut TxContext) {
        transfer::share_object<SCoinTreasury<T0, T1>>(create_s_coin_treasury<T0, T1>(arg0, arg1, arg2, arg3));
    }
    
    public fun mint_s_coin<T0, T1>(arg0: &mut SCoinTreasury<T0, T1>, arg1: Coin<MarketCoin<T1>>, arg2: &mut TxContext): Coin<T0> {
        let v = coin::value<MarketCoin<T1>>(&arg1);
        balance::join<MarketCoin<T1>>(&mut arg0.market_coin_balance, coin::into_balance<MarketCoin<T1>>(arg1));
        coin::from_balance<T0>(balance::increase_supply<T0>(&mut arg0.s_coin_supply, v), arg2)
    }
    
    public fun total_supply<T0, T1>(arg0: &SCoinTreasury<T0, T1>) : u64 {
        balance::supply_value<T0>(&arg0.s_coin_supply)
    }
    
    // decompiled from Move bytecode v6
}

