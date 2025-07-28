import { AggregatorClient, Env } from "@cetusprotocol/aggregator-sdk";
import BN from "bn.js"


async function main() {
  
  const aggregatorURL = "https://api-sui.cetus.zone/router_v2/find_routes";
  const client = new AggregatorClient(
    {
      endpoint: aggregatorURL,
      // default to mainnet
      env: Env.Mainnet
    }
  )

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
