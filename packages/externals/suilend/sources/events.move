module liquid_staking::events {
    use sui::event;

    // Thin wrapper for events. Has the advantage of allowing events
    // added in package upgrades to preserve the original package address
    public struct Event<T: copy + drop> has copy, drop {
        event: T,
    }

    public(package) fun emit_event<T: copy + drop>(event: T) {
        event::emit(Event { event });
    }
}
