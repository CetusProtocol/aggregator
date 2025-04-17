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

# Aggregator SDK

## Install

The SDK is published to npm registry. To use the SDK in your project, you can

```
npm install @cetusprotocol/aggregator-sdk
```

## Usage

### 1. Init client with rpc and package config

```typescript
const client = new AggregatorClient()
```

### 2. Get best router swap result from aggregator service

```typescript
const amount = new BN(1000000)
const from = "0x2::sui::SUI"
const target =
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"

const routers = await client.findRouters({
  from,
  target,
  amount,
  byAmountIn: true, // true means fix input amount, false means fix output amount
})
```

### 3. Confirm and do fast swap

```typescript
const txb = new Transaction()

if (routerRes != null) {
  await client.fastRouterSwap({
    routers,
    txb,
    slippage: 0.01,
  })

  const result = await client.devInspectTransactionBlock(txb, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(txb, keypair)
  }
  console.log("result", result)
}
```

### 4. Build PTB and return target coin

```typescript
const txb = new Transaction()
const byAmountIn = true

if (routerRes != null) {
  const targetCoin = await client.routerSwap({
    routers,
    txb,
    inputCoin,
    slippage: 0.01,
  })

  // you can use this target coin object argument to build your ptb.
  client.transferOrDestoryCoin(txb, targetCoin, targetCoinType)

  const result = await client.devInspectTransactionBlock(txb, keypair)

  if (result.effects.status.status === "success") {
    console.log("Sim exec transaction success")
    const result = await client.signAndExecuteTransaction(txb, keypair)
  }
  console.log("result", result)
}
```

# Aggregator Contract Interface

## Tags corresponding to different networks

| Contract                  | Tag of Repo | Latest published at address                                        |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| CetusAggregatorV2         | mainnet     | 0x3864c7c59a4889fec05d1aae4bc9dba5a0e0940594b424fbed44cb3f6ac4c032 |
| CetusAggregatorV2ExtendV1 | mainnet     | 0x39402d188b7231036e52266ebafad14413b4bf3daea4ac17115989444e6cd516 |
| CetusAggregatorV2ExtendV2 | mainnet     | 0x368d13376443a8051b22b42a9125f6a3bc836422bb2d9c4a53984b8d6624c326 |

## Example

```
CetusAggregatorV2 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2", rev = "mainnet", override = true }

CetusAggregatorV2ExtendV1 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2-extend-v1", rev = "mainnet", override = true }

CetusAggregatorV2ExtendV2 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2-extend-v1", rev = "mainnet", override = true }
```

## Usage

Cetus clmm interface is not complete(just have function definition), so it will fails when sui client check the code version. However, this does not affect its actual functionality. Therefore, we need to add a --dependencies-are-root during the build.

```
sui move build --dependencies-are-root && sui client publish --dependencies-are-root
```

# More About Cetus

Use the following links to learn more about Cetus:

Learn more about working with Cetus in the [Cetus Documentation](https://cetus-1.gitbook.io/cetus-docs).

Join the Cetus community on [Cetus Discord](https://discord.com/channels/1009749448022315008/1009751382783447072).
