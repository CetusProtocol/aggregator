/**
 * Fallback wallet used for simulation when no SUI_WALLET_SECRET / SUI_WALLET_MNEMONICS
 * is configured. Should be a real mainnet address that holds the coins under test;
 * no private key is required (simulation only).
 */
export const TEST_FALLBACK_WALLET = process.env.SUI_TEST_FALLBACK_WALLET || ""

/**
 * Overlay fee receiver used in tests.
 * TODO: replace with an actual fee receiver address before running against real fee flows.
 */
export const TEST_OVERLAY_FEE_RECEIVER = "0x0"
