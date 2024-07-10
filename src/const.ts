import BN from "bn.js"

/**
 * The address representing the clock in the system.
 */
export const CLOCK_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000006"

/**
 * The address for CoinInfo module.
 */
export const CoinInfoAddress = "0x1::coin::CoinInfo"

/**
 * The address for CoinStore module.
 */
export const CoinStoreAddress = "0x1::coin::CoinStore"

export const SuiZeroCoinFn = "0x2::coin::zero"

// Dex names
export const AGGREGATOR = "aggregator"
export const CETUS_DEX = "CETUS"
export const DEEPBOOK_DEX = "DEEPBOOK"
export const KRIYA_DEX = "KRIYA"
export const FLOWX_AMM = "FLOWX"
export const TURBOS_DEX = "TURBOS"
export const AFTERMATH_AMM = "AFTERMATH"

export const INTEGRATE = "integrate"

// Module names
export const CETUS_MODULE = "cetus"
export const DEEPBOOK_MODULE = "deepbook"
export const KRIYA_MODULE = "kriya"
export const UTILS_MODULE = "utils"
export const POOL_MODULT = "pool"
export const PAY_MODULE = "pay"
export const FLOWX_AMM_MODULE = "flowx_amm"
export const TURBOS_MODULE = "turbos"
export const AFTERMATH_MODULE = "aftermath"

export const DEEPBOOK_CUSTODIAN_V2_MODULE = "custodian_v2"
export const DEEPBOOK_CLOB_V2_MODULE = "clob_v2"

// Function names
export const FlashSwapFunc = "flash_swap"
export const FlashSwapWithPartnerFunc = "flash_swap_with_partner"
export const RepayFalshSwapFunc = "repay_flash_swap"
export const RepayFlashSwapWithPartnerFunc = "repay_flash_swap_with_partner"

export const FlashSwapA2BFunc = "flash_swap_a2b"
export const FlashSwapB2AFunc = "flash_swap_b2a"

export const FlashSwapWithPartnerA2BFunc = "flash_swap_with_partner_a2b"
export const FlashSwapWithPartnerB2AFunc = "flash_swap_with_partner_b2a"

export const REPAY_FLASH_SWAP_A2B_FUNC = "repay_flash_swap_a2b"
export const REPAY_FLASH_SWAP_B2A_FUNC = "repay_flash_swap_b2a"

export const REPAY_FLASH_SWAP_WITH_PARTNER_A2B_FUNC =
  "repay_flash_swap_with_partner_a2b"
export const REPAY_FLASH_SWAP_WITH_PARTNER_B2A_FUNC =
  "repay_flash_swap_with_partner_b2a"

export const SWAP_A2B_FUNC = "swap_a2b"
export const SWAP_B2A_FUNC = "swap_b2a"

export const TRANSFER_OR_DESTORY_COIN_FUNC = "transfer_or_destroy_coin"
export const CHECK_COINS_THRESHOLD_FUNC = "check_coins_threshold"

export const JOIN_FUNC = "join_vec"

export const TRANSFER_ACCOUNT_CAP = "transfer_account_cap"

// Package IDs
export const DEEPBOOK_PACKAGE_ID =
  "0x000000000000000000000000000000000000000000000000000000000000dee9"
export const DEEPBOOK_PUBLISHED_AT =
  "0x000000000000000000000000000000000000000000000000000000000000dee9"

export const CETUS_PUBLISHED_AT =
  "0x70968826ad1b4ba895753f634b0aea68d0672908ca1075a2abdf0fc9e0b2fc6a"

// Mainnet Cetus objects IDs
export const MAINNET_CETUS_GLOBAL_CONFIG_ID =
  "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f"

// Testnet Cetus objects IDs
export const TESTNET_CETUS_GLOBAL_CONFIG_ID =
  "0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a"

export const ZERO = new BN(0)

export const ONE = new BN(1)

export const TWO = new BN(2)

export const U128 = TWO.pow(new BN(128))

export const U64_MAX_BN = new BN("18446744073709551615")

export const U64_MAX = "18446744073709551615"

export const MAINNET_FLOWX_AMM_CONTAINER_ID =
  "0xb65dcbf63fd3ad5d0ebfbf334780dc9f785eff38a4459e37ab08fa79576ee511"
export const TESTNET_FLOWX_AMM_CONTAINER_ID = ""

export const TURBOS_VERSIONED =
  "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f"

export const MAINNET_AFTERMATH_REGISTRY_ID =
  "0xfcc774493db2c45c79f688f88d28023a3e7d98e4ee9f48bbf5c7990f651577ae"
export const TESTNET_AFTERMATH_REGISTRY_ID = ""
export const MAINNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID =
  "0xf194d9b1bcad972e45a7dd67dd49b3ee1e3357a00a50850c52cd51bb450e13b4"
export const TESTNET_AFTERMATH_PROTOCOL_FEE_VAULT_ID = ""
export const MAINNET_AFTERMATH_TREASURY_ID =
  "0x28e499dff5e864a2eafe476269a4f5035f1c16f338da7be18b103499abf271ce"
export const TESTNET_AFTERMATH_TREASURY_ID = ""
export const MAINNET_AFTERMATH_INSURANCE_FUND_ID =
  "0xf0c40d67b078000e18032334c3325c47b9ec9f3d9ae4128be820d54663d14e3b"
export const TESTNET_AFTERMATH_INSURANCE_FUND_ID = ""
export const MAINNET_AFTERMATH_REFERRAL_VAULT_ID =
  "0x35d35b0e5b177593d8c3a801462485572fc30861e6ce96a55af6dc4730709278"
export const TESTNET_AFTERMATH_REFERRAL_VAULT_ID = ""
