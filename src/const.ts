import BN from "bn.js"

// =============================================================================
// MATHEMATICAL CONSTANTS
// =============================================================================

export const ZERO = new BN(0)

export const ONE = new BN(1)

export const TWO = new BN(2)

export const U128 = TWO.pow(new BN(128))

export const U64_MAX_BN = new BN("18446744073709551615")

export const U64_MAX = "18446744073709551615"
export const TEN_POW_NINE = 1000000000

// =============================================================================
// LEGACY DEX CONSTANTS (for backward compatibility)
// =============================================================================

export const AGGREGATOR = "aggregator"
export const CETUS_DEX = "CETUS"
export const DEEPBOOK_DEX = "DEEPBOOK"
export const KRIYA_DEX = "KRIYA"
export const FLOWX_AMM = "FLOWX"
export const TURBOS_DEX = "TURBOS"
export const AFTERMATH_AMM = "AFTERMATH"
export const INTEGRATE = "integrate"

// Legacy module names
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

// Legacy function names
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

// Legacy misc constants
export const CLOCK_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000006"
export const CoinInfoAddress = "0x1::coin::CoinInfo"
export const CoinStoreAddress = "0x1::coin::CoinStore"
export const SuiZeroCoinFn = "0x2::coin::zero"

// Legacy package IDs
export const DEEPBOOK_PACKAGE_ID =
  "0x000000000000000000000000000000000000000000000000000000000000dee9"
export const DEEPBOOK_PUBLISHED_AT =
  "0x000000000000000000000000000000000000000000000000000000000000dee9"

export const CETUS_PUBLISHED_AT =
  "0x70968826ad1b4ba895753f634b0aea68d0672908ca1075a2abdf0fc9e0b2fc6a"

// Cetus V3 published-at constant
export const CETUS_V3_PUBLISHED_AT =
  "0x550dcd6070230d8bf18d99d34e3b2ca1d3657b76cc80ffdacdb2b5d28d7e0124"

// Legacy Cetus objects IDs
export const MAINNET_CETUS_GLOBAL_CONFIG_ID =
  "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f"
export const TESTNET_CETUS_GLOBAL_CONFIG_ID =
  "0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a"

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

// =============================================================================
// PACKAGE NAMES
// =============================================================================

export const PACKAGE_NAMES = {
  AGGREGATOR_V3: "aggregator_v3",
} as const

// =============================================================================
// DEFAULT ENDPOINT
// =============================================================================

export const DEFAULT_AGG_V3_ENDPOINT = "https://api-sui.cetus.zone/router_v3"
export const DEFAULT_AGG_V2_ENDPOINT = "https://api-sui.cetus.zone/router_v2"

// =============================================================================
// PYTH CONFIGURATION
// =============================================================================

export const PYTH_CONFIG = {
  Testnet: {
    wormholeStateId:
      "0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790",
    pythStateId:
      "0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c",
  },
  Mainnet: {
    wormholeStateId:
      "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c",
    pythStateId:
      "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8",
  },
} as const

// =============================================================================
// PUBLISHED PACKAGE ADDRESSES
// =============================================================================

export const PUBLISHED_ADDRESSES = {
  // Include cetus、deepbookv2、flowxv2 & v3、kriyav2 & v3、turbos、aftermath、haedal、afsui、volo、bluemove
  V2: {
    Mainnet:
      "0x8ae871505a80d8bf6bf9c05906cda6edfeea460c85bebe2e26a4313f5e67874a", // version 12
    Testnet:
      "0x52eae33adeb44de55cfb3f281d4cc9e02d976181c0952f5323648b5717b33934",
  },
  // Include deepbookv3, scallop, bluefin
  V2_EXTEND: {
    Mainnet:
      "0x8a2f7a5b20665eeccc79de3aa37c3b6c473eca233ada1e1cd4678ec07d4d4073", // version 17
    Testnet:
      "0xabb6a81c8a216828e317719e06125de5bb2cb0fe8f9916ff8c023ca5be224c78",
  },
  V2_EXTEND2: {
    Mainnet:
      "0x5cb7499fc49c2642310e24a4ecffdbee00133f97e80e2b45bca90c64d55de880", // version 8
    Testnet: "0x0",
  },
} as const

// =============================================================================
// DEEPBOOK V3 DEEP FEE TYPES
// =============================================================================

export const DEEPBOOK_V3_DEEP_FEE_TYPES = {
  Mainnet:
    "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  Testnet:
    "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP",
} as const

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export const CLIENT_CONFIG = {
  DEFAULT_PYTH_URL: "https://hermes.pyth.network",
  PYTH_TIMEOUT: 3000,
  MAX_OVERLAY_FEE_RATE_PARAMS: 0.1,
  FEE_RATE_MULTIPLIER: 1000000,
  MAX_FEE_RATE: 100000,
  DEFAULT_OVERLAY_FEE_RECEIVER: "0x0",

  // Error Messages
  ERRORS: {
    SIGNER_REQUIRED: "Signer is required, but not provided.",
    INVALID_OVERLAY_FEE_RATE: "Overlay fee rate must be between 0 and 0.1",
    INVALID_SLIPPAGE:
      "Invalid slippage value. Must be between 0 and 1 (e.g., 0.01 represents 1% slippage)",
    NO_ROUTER_FOUND: "No router found",
    EMPTY_PATH: "Empty path",
    UNSUPPORTED_DEX: "Unsupported dex",
    PYTH_UNAVAILABLE:
      "All Pyth price nodes are unavailable. Cannot fetch price data. Please switch to or add new available Pyth nodes",
    QUOTE_ID_REQUIRED: "Quote ID is required",
    AGGREGATOR_V3_PACKAGE_REQUIRED: "Aggregator V3 package is required",
    PACKAGES_REQUIRED: "Packages are required",
    OVERLAY_FEE_RECEIVER_REQUIRED:
      "Overlay fee rate is set, but overlay fee receiver is not set",
  },
} as const

// =============================================================================
// AGGREGATOR V3 CONSTANTS
// =============================================================================

export const AGGREGATOR_V3_CONFIG = {
  FEE_DENOMINATOR: 1000000,
  MAX_FEE_RATE: 100000, // 10%
  MAX_AMOUNT_IN: U64_MAX,

  DEFAULT_PUBLISHED_AT: {
    Mainnet:
      "0x07c27e879ba9282506284b0fef26d393978906fc9496550d978c6f493dbfa3e5",
    Testnet: "0x0",
  },
} as const
