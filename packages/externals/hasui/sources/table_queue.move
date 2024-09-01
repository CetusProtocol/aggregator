module hasui::table_queue {
    use sui::table::Table;

    #[allow(unused_field)]
    struct TableQueue<phantom Ty0: store> has store {
        head: u64,
        tail: u64,
        contents: Table<u64, Ty0>
    }
}