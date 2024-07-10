export function completionCoin(s: string): string {
  const index = s.indexOf("::")
  if (index === -1) {
    return s
  }

  const prefix = s.substring(0, index)
  const rest = s.substring(index)

  if (!prefix.startsWith("0x")) {
    return s
  }

  const hexStr = prefix.substring(2)

  if (hexStr.length > 64) {
    return s
  }

  const paddedHexStr = hexStr.padStart(64, "0")

  return `0x${paddedHexStr}${rest}`
}

export function compareCoins(coinA: string, coinB: string): boolean {
  coinA = completionCoin(coinA)
  coinB = completionCoin(coinB)
  const minLength = Math.min(coinA.length, coinB.length)

  for (let i = 0; i < minLength; i++) {
    if (coinA[i] > coinB[i]) {
      return true
    } else if (coinA[i] < coinB[i]) {
      return false
    }
  }

  // If both strings are the same length and all characters are equal
  return true // or coinB, they are equal
}

export function parseTurbosPoolFeeType(typeData: string) {
  // "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::Pool<0xc91acfb75009c5ff2fd57c54f3caaee12ad1fbe997681334adc0b574fc277a07::icorgi::ICORGI, 0x2::sui::SUI, 0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee10000bps::FEE10000BPS>"
  const regex = /,([^,>]*>)/g
  const matches = [...typeData.matchAll(regex)]
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1][1]
    return lastMatch.substring(0, lastMatch.length - 1).trim()
  }
  return null
}

export function parseAftermathFeeType(typeData: string) {
  // 0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c::pool::Pool<0xf66c5ba62888cd0694677bbfbd2332d08ead3b8a4332c40006c474e83b1a6786::af_lp::AF_LP>
  // get 0xf66c5ba62888cd0694677bbfbd2332d08ead3b8a4332c40006c474e83b1a6786::af_lp::AF_LP
  const regex = /<([^>]*)>/
  const matches = typeData.match(regex)
  if (matches) {
    return matches[1]
  }
}
