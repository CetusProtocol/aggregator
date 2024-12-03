<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a >
    <img src="https://archive.cetus.zone/assets/image/logo.png" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">Cetus Plus Swap Aggregator</h3>

  <p align="center">
    Integrating Cetus-Aggregator-SDK: A Comprehensive Guide, Please see details in document.
    <br />
    <a href="https://cetus-1.gitbook.io/cetus-developer-docs/developer/cetus-plus-aggregator"><strong>Explore the document »</strong>
    </a>
  </p>
</div>

# Welcome to Cetus Plus Swap Aggregator

Cetus plus swap aggregator is a high-speed and easy-to-integrate solution designed to optimize your trading experience on the Sui blockchain. This aggregator integrates multiple mainstream decentralized exchanges (DEX) on the Sui chain, including various types of trading platforms, providing users with the best trading prices and the lowest slippage.

Core Advantages:

High-Speed Transactions: Thanks to advanced algorithms and efficient architecture, our aggregator can execute transactions at lightning speed, ensuring users get the best opportunities in a rapidly changing market.

Easy Integration: The aggregator is designed to be simple and easy to integrate. Whether you are an individual developer or a large project team, you can quickly connect and deploy.

Multi-Platform Support: Currently, we have integrated multiple mainstream DEXs on the Sui chain, including cetus, deepbook, kriya, flowx, aftermath, afsui, haedal, volo, turbos etc, allowing users to enjoy a diversified trading experience on a single platform.

By using our aggregator, you can trade more efficiently and securely on the Sui blockchain, fully leveraging the various opportunities brought by decentralized finance (DeFi).

# Install

The SDK is published to npm registry. To use the SDK in your project, you can

```
npm install @cetusprotocol/aggregator-sdk
```

# Usage

## 1. Init client with rpc and package config

```typescript
const client = new AggregatorClient()
```

## 2. Get best router swap result from aggregator service

```typescript
const amount = new BN(1000000)
const from = "0x2::sui::SUI"
const target =
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"

const routerRes = await client.findRouters({
  from,
  target,
  amount,
  byAmountIn: true, // true means fix input amount, false means fix output amount
})
```

## 3. Confirm and do fast swap

```typescript
const routerTx = new Transaction()

if (routerRes != null) {
  await client.fastRouterSwap({
    routers: routerRes.routes,
    byAmountIn,
    txb: routerTx,
    slippage: 0.01,
    isMergeTragetCoin: true,
    refreshAllCoins: true,
  })

  let result = await client.devInspectTransactionBlock(routerTx, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(routerTx, keypair)
  }
  console.log("result", result)
}
```

## 4. Build PTB and return target coin

```typescript
const routerTx = new Transaction()
const byAmountIn = true;

if (routerRes != null) {
  const targetCoin = await client.routerSwap({
    routers: routerRes.routes,
    byAmountIn,
    txb: routerTx,
    inputCoin,
    slippage: 0.01,
  })

  // you can use this target coin object argument to build your ptb.
  const client.transferOrDestoryCoin(
      txb,
      targetCoin,
      targetCoinType
  )

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
