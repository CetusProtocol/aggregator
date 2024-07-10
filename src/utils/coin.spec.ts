import { parseTurbosPoolFeeType } from "./coin"

describe("Coin Utils", () => {
  it("should fetch token infos by URL and return data", async () => {
    const typeDate =
      "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::pool::Pool<0xc91acfb75009c5ff2fd57c54f3caaee12ad1fbe997681334adc0b574fc277a07::icorgi::ICORGI, 0x2::sui::SUI, 0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee10000bps::FEE10000BPS>"
    const result = parseTurbosPoolFeeType(typeDate)
    console.log("parse turbos pool type", result)
  })
})
