#[allow(unused_field)]
module alphafi_liquid_staking::version;

// When the package called has an outdated version
const EIncorrectVersion: u64 = 0;

/// Capability object given to the pool creator
public struct Version has drop, store (u16)
