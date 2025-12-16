#[allow(unused_field)]
module magma::acl {
    use magma_move_stl::linked_table::LinkedTable;

    public struct ACL has store {
        permissions: LinkedTable<address, u128>,
    }
}
