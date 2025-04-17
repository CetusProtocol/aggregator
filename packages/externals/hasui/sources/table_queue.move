#[allow(unused_field)]
module hasui::table_queue;

use sui::table::Table;

public struct TableQueue<phantom Ty0: store> has store {
    head: u64,
    tail: u64,
    contents: Table<u64, Ty0>,
}
