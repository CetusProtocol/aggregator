module liquid_staking::version {
  
    // ===== Errors =====

    // When the package called has an outdated version
    const EIncorrectVersion: u64 = 0;

    /// Capability object given to the pool creator
    public struct Version has store, drop (u16)

    public(package) fun new(
        version: u16,
    ): Version {
        Version(version)
    }
    
    public(package) fun migrate_(
        version: &mut Version,
        current_version: u16,
    ) {
        assert!(version.0 < current_version, EIncorrectVersion);
        version.0 = current_version;
    }

    public(package) fun assert_version(
        version: &Version,
        current_version: u16,
    ) {
        assert!(version.0 == current_version, EIncorrectVersion);
    }

    public(package) fun assert_version_and_upgrade(
        version: &mut Version,
        current_version: u16,
    ) {
        if (version.0 < current_version) {
            version.0 = current_version;
        };
        assert_version(version, current_version);
    }
}
