#[allow(unused_field)]
module alphafi_liquid_staking::cell;

public struct Cell<Element> has store {
    element: Option<Element>,
}
