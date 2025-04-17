module hawal::vault;

use sui::balance::{Self, Balance};

public struct Vault<phantom T> has key, store {
    id: UID,
    cache_pool: Balance<T>,
}
