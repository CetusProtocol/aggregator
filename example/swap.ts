import { AggregatorClient } from "@cetusprotocol/aggregator-sdk"
import BN from "bn.js"

async function main() {
  // default to mainnet
  const client = new AggregatorClient()

  const from = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI"
  const target = "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"

  const routers = await client.findRouters({
    from,
    target,
    amount: new BN(1000000000),
    byAmountIn: true,
  })

  console.log(routers)
}

main()
