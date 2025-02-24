module sprungsui::sprungsui {
    use sui::coin::{Self};

    public struct SPRUNGSUI has drop {}

    fun init(witness: SPRUNGSUI, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 
            9, 
            b"", 
            b"Staked SUI", 
            b"", 
            option::none(),
            ctx
        );

        transfer::public_share_object(metadata);
        transfer::public_transfer(treasury, ctx.sender())
    }
}
