<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a >
    <img src="https://archive.cetus.zone/assets/image/logo.png" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">Cetus Plus Swap Aggregator</h3>

  <p align="center">
    Integrating Cetus-CLMM-SUI-SDK: A Comprehensive Guide, Please see details in document.
    <br />
    <a href="https://cetus-1.gitbook.io/cetus-developer-docs/developer/dev-overview"><strong>Explore the document »</strong>
    </a>
  </p>
</div>

# Welcome to Cetus Plus Swap Aggregator

Cetus plus swap aggregator is a high-speed and easy-to-integrate solution designed to optimize your trading experience on the Sui blockchain. This aggregator integrates multiple mainstream decentralized exchanges (DEX) on the Sui chain, including various types of trading platforms, providing users with the best trading prices and the lowest slippage.

Core Advantages:

High-Speed Transactions: Thanks to advanced algorithms and efficient architecture, our aggregator can execute transactions at lightning speed, ensuring users get the best opportunities in a rapidly changing market.

Easy Integration: The aggregator is designed to be simple and easy to integrate. Whether you are an individual developer or a large project team, you can quickly connect and deploy.

Multi-Platform Support: Currently, we have integrated multiple mainstream DEXs on the Sui chain, including cetus, deepbook, kriya, flowx, aftermath, turbos etc, allowing users to enjoy a diversified trading experience on a single platform.

By using our aggregator, you can trade more efficiently and securely on the Sui blockchain, fully leveraging the various opportunities brought by decentralized finance (DeFi).

# Install

The SDK is published to npm registry with experimental version. To use the SDK in your project, you can

```
npm install aggregator-sdk@0.0.0-experimental-20240521171554
```

# Usage

## 1. Init client with rpc and package config

```typescript
// used to do simulate swap and swap
const fullNodeURL = process.env.SUI_RPC!

// used to do swap
const secret = process.env.SUI_WALLET_SECRET!

// provider by cetus
const aggregatorURL = "https://api-sui.cetus.zone/router_v2"

// process wallet secret
const byte = Buffer.from(secret, "base64")
const u8Array = new Uint8Array(byte)
keypair = secret
  ? Ed25519Keypair.fromSecretKey(u8Array.slice(1, 33))
  : buildTestAccount()
const wallet = keypair.getPublicKey().toSuiAddress()

const aggregatorPackage = {
  packageName: "aggregator",
  packageId:
    "0x640d44dbdc0ede165c7cc417d7f57f1b09648083109de7132c6b3fb15861f5ee",
  publishedAt:
    "0x640d44dbdc0ede165c7cc417d7f57f1b09648083109de7132c6b3fb15861f5ee",
}

const integratePackage = {
  packageName: "integrate",
  packageId:
    "0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3",
  publishedAt:
    "0x8faab90228e4c4df91c41626bbaefa19fc25c514405ac64de54578dec9e6f5ee",
}

const config = new AggregatorConfig(
  aggregatorURL,
  fullNodeURL,
  wallet,
  [aggregatorPackage, integratePackage],
  ENV.MAINNET
)
const client = new AggregatorClient(config)
```

## 2. Get best router swap result from aggregator service

```typescript
const amount = new BN(1000000)

const from = M_SUI // 0x2::sui::SUI
const target = M_CETUS // 0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS

const routerRes = await client.findRouter({
  from,
  target,
  amount,
  byAmountIn: true, // true means fix input amount, false means fix output amount
  depth: 3, // max allow 3, means 3 hops
  splitAlgorithm: null, // select split algotirhm, recommended default set null
  splitFactor: null,
  splitCount: 100, // set max expect split count
  providers: [
    "AFTERMATH",
    "CETUS",
    "DEEPBOOK",
    "KRIYA",
    "FLOWX",
    "AFTERMATH",
    "TRUBOS",
  ], //  now max support above seven platform.
})

if (routerRes != null) {
  console.log(JSON.stringify(res, null, 2))
}
```

## 3. Confirm and do swap

```typescript
if (routerRes != null) {
  const routerTx = await client.routerSwap({
    routers: res.routes,
    amountIn: res.amountIn,
    amountOut: res.amountOut,
    byAmountIn,
    slippage: 0.01,
    fromCoinType: from,
    targetCoinType: target,
    partner: undefined,
    isMergeTragetCoin: true,
  })

  let result = await client.devInspectTransactionBlock(routerTx, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(routerTx, keypair)
  }
  console.log("result", result)
}
```

# More About Cetus

Use the following links to learn more about Cetus:

Learn more about working with Cetus in the [Cetus Documentation](https://cetus-1.gitbook.io/cetus-docs).

Join the Cetus community on [Cetus Discord](https://discord.com/channels/1009749448022315008/1009751382783447072).
