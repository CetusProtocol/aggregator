module gauge_cap::gauge_cap {
    public struct GAUGE_CAP has drop {
        dummy_field: bool,
    }

    public struct CreateCap has key, store {
        id: 0x2::object::UID,
    }

    public struct GaugeCap has key, store {
        id: 0x2::object::UID,
        gauge_id: 0x2::object::ID,
        pool_id: 0x2::object::ID,
    }

    public fun create_gauge_cap(
        arg0: &CreateCap,
        arg1: 0x2::object::ID,
        arg2: 0x2::object::ID,
        arg3: &mut 0x2::tx_context::TxContext,
    ): GaugeCap {
        GaugeCap {
            id: 0x2::object::new(arg3),
            gauge_id: arg2,
            pool_id: arg1,
        }
    }

    public fun get_gauge_id(arg0: &GaugeCap): 0x2::object::ID {
        arg0.gauge_id
    }

    public fun get_pool_id(arg0: &GaugeCap): 0x2::object::ID {
        arg0.pool_id
    }

    public fun grant_create_cap(
        arg0: &0x2::package::Publisher,
        arg1: address,
        arg2: &mut 0x2::tx_context::TxContext,
    ) {
        let v0 = CreateCap { id: 0x2::object::new(arg2) };
        0x2::transfer::public_transfer<CreateCap>(v0, arg1);
    }
}
