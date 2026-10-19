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

Multi-Platform Support: Currently, we have integrated multiple mainstream DEXs on the Sui chain, including cetus, kriya, kriyav3, flowx, flowxv3, turbos, aftermath, haedal, volo, afsui, bluemove, deepbookv3, scallop, suilend, bluefin, haedalpmm, haedalhmmv2, alphafi, springsui, steamm, steamm_omm, steamm_omm_v2, metastable, obric, hawal, momentum, magma, fullsail, cetusdlmm, ferradlmm, ferraclmm, bolt, allowing users to enjoy a diversified trading experience on a single platform.

Sponsored Transactions: The SDK can build swap PTBs that do not use the user's gas coin, allowing a separate sponsor account to pay transaction gas.

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
const client = new AggregatorClient({})
```

### 2. Get best router swap result from aggregator service

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

### 3. Confirm and do fast swap

```typescript
const txb = new Transaction()

if (routerRes != null) {
  await client.fastRouterSwap({
    router: routerRes,
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

### 4. Sponsored transaction: sponsor pays gas

Set `sponsored: true` when building the swap. In this mode the swap does not use `txb.gas` as input or output, because the gas coin belongs to the sponsor.

```typescript
import { Transaction } from "@mysten/sui/transactions"
import { SUI_TYPE_ARG } from "@mysten/sui/utils"

const sender = userSigner.toSuiAddress()
const sponsor = sponsorSigner.toSuiAddress()
const txb = new Transaction()

await client.fastRouterSwap({
  router: routerRes,
  txb,
  slippage: 0.01,
  sponsored: true,
})

// Build command-only bytes. Pass sender so CoinWithBalance can resolve
// the user's input coins before the sponsor adds gas data.
const txKindBytes = await client.buildTransactionKind(txb, sender)

const { objects: gasCoins } = await client.client.listCoins({
  owner: sponsor,
  coinType: SUI_TYPE_ARG,
  limit: 1,
})

const sponsorCoins = gasCoins.map((coin) => ({
  objectId: coin.objectId,
  version: coin.version,
  digest: coin.digest,
}))

const sponsoredTx = client.buildSponsoredTransaction({
  txKindBytes,
  sender,
  sponsor,
  sponsorCoins,
  gasBudget: "100000000",
})

const result = await client.signAndExecuteSponsoredTransaction(
  sponsoredTx,
  userSigner,
  sponsorSigner
)
```

For a gas-station integration, the same flow is split across two parties: the user builds `txKindBytes`, the sponsor sets `gasOwner` and `gasPayment`, then both parties sign the same full transaction bytes.

#### Sponsor secret for the real transaction test

The real sponsored transaction test reuses the existing wallet secret as the user/sender and adds one sponsor secret:

```bash
SUI_WALLET_SECRET="user_base64_secret" \
SUI_SPONSOR_SECRET="sponsor_base64_secret" \
npx vitest run tests/unit/sponsored.test.ts
```

`SUI_WALLET_SECRET` owns the swap input coins and signs as the transaction sender. `SUI_SPONSOR_SECRET` owns the gas coin and signs as the gas sponsor. Use two different accounts; the sponsor account only needs enough SUI to cover `SPONSORED_GAS_BUDGET` (`100000000` MIST by default).

Optional test variables:

```bash
SPONSORED_SWAP_AMOUNT=1000000
SPONSORED_GAS_BUDGET=100000000
SUI_RPC="https://fullnode.mainnet.sui.io:443"
```

If either secret is missing, `tests/unit/sponsored.test.ts` is skipped and no transaction is submitted.

Keep both secrets in your local shell or `.env` file, and do not commit them.

### 5. Build PTB and return target coin

```typescript
const txb = new Transaction()
const byAmountIn = true

if (routerRes != null) {
  const targetCoin = await client.routerSwap({
    router: routerRes,
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

### 6. Verify on-chain errors with typed error codes

When a swap fails on-chain (e.g. the price moved and the slippage check aborts),
the transaction effects only carry a raw `MoveAbort(...)` string. The SDK can
verify it and surface a typed error code.

Execution methods themselves never throw on on-chain failure — verification is
opt-in via `throwOnAggregatorContractFailure`:

```typescript
import {
  AggregatorError,
  TransactionErrorCode,
  throwOnAggregatorContractFailure,
} from "@cetusprotocol/aggregator-sdk"

try {
  const res = await client.sendTransaction(txb, signer)
  throwOnAggregatorContractFailure(res) // throws AggregatorError if the tx failed
  // success — use res.events / res.balanceChanges as usual
} catch (e) {
  if (
    AggregatorError.isAggregatorErrorCode(
      e,
      TransactionErrorCode.AmountOutSlippageCheckFailed
    )
  ) {
    // abort code 1: increase slippage tolerance or refresh the quote
  } else if (
    AggregatorError.isAggregatorErrorCode(
      e,
      TransactionErrorCode.TransactionFailed
    )
  ) {
    // failed on-chain, but not an aggregator contract abort (gas, pool abort, ...)
    console.log((e as AggregatorError).message)
  } else {
    throw e // network / build / signing errors
  }
}
```

This also works on results from wallet adapters (e.g. `@mysten/dapp-kit`
`useSignAndExecuteTransaction`) as long as effects are included, and supports
both the legacy JSON-RPC effects shape and the current `@mysten/sui` shape.

If you prefer branching over try/catch (e.g. mapping to i18n keys), parse
without throwing:

```typescript
import { parseAggregatorContractError } from "@cetusprotocol/aggregator-sdk"

const parsed = parseAggregatorContractError(
  result.effects?.status?.error?.message ?? result.effects?.status?.error
)
if (parsed) {
  parsed.code      // 1 (on-chain abort code)
  parsed.errorCode // TransactionErrorCode.AmountOutSlippageCheckFailed
  parsed.msg       // "Slippage check failed: ..."
  parsed.command   // index of the failed PTB command
}
// parsed === null → the failure did not come from the aggregator contract
```

You can also pre-flight before the user signs, by running the same parser on a
`devInspectTransactionBlock` simulation result.

Common error codes for a swap UI:

| errorCode                      | Abort code | Suggested user action           |
| ------------------------------ | ---------- | ------------------------------- |
| `AmountOutSlippageCheckFailed` | 1          | Increase slippage / re-quote    |
| `ExceedMaxAmountIn`            | 7          | Re-quote (exact-out swap)       |
| `InvalidSlippage`              | 9          | Slippage parameter out of range |
| `TransactionFailed`            | —          | Generic failure, show message   |

### 7. Tight slippage and CETUS_TIDE

Pass your intended slippage to `findRouters` so providers that cannot honor
very tight limits are excluded automatically. When `slippage` is at or below
`0.001` (≤0.1%), `CETUS_TIDE` is removed from the effective providers list,
avoiding routes that would abort on-chain with a slippage check failure:

```typescript
const routerRes = await client.findRouters({
  from,
  target,
  amount,
  byAmountIn: true,
  slippage: 0.0005, // 0.05% — CETUS_TIDE is filtered out automatically
})
```

The `slippage` parameter is optional and is not sent to the router API; when
omitted, behavior is unchanged.

### 8. Filtering pools for a quote

Use `includePools` to allow only the listed pool IDs, and `excludePools` to exclude
specific IDs. Both apply to every hop, direction and split of this request.
Exclusions win when an ID appears in both lists. Use the `id` returned in a quote's
`paths`; Sui object IDs are normalized, while logical pool IDs are case-sensitive.

```typescript
const routerRes = await client.findRouters({
  from,
  target,
  amount,
  byAmountIn: true,
  includePools: [poolA, poolB],
  excludePools: [poolB], // Only poolA remains eligible.
})
```

A nonempty include list restricts the entire route, including intermediate pools
in multi-hop routes. It does not require every listed pool to be used. A valid
unknown excluded ID has no effect; an include list with no matching available
pools leaves no route. Neither filter overrides `providers` or service-side bans.

The optional `includePools?: string[]` and `excludePools?: string[]` fields are also
supported by `findMergeSwapRouters`, `findRebalanceRouters`, and the liquidity-change
POST quote path. Omitting either field or passing an empty array leaves that filter
inactive. The SDK sends `include_pools` and `exclude_pools` as comma-separated
strings, with URL encoding for GET. Calls without these options stay unchanged.

The SDK only joins each array into a CSV string and forwards it. The server owns
ID validation, normalization, limits (50 entries and 4096 UTF-8 bytes per list),
include/exclude precedence and route filtering. Server errors follow the existing
SDK error handling. The SDK does not inspect returned pool IDs or retry quotes
without filters.

Use an Aggregator deployment that supports these fields before enabling them in
callers; older endpoints may ignore unknown parameters.

Pool filters only affect the current quote. If no route remains, the server returns
its no-route error (`5010`). After changing either list, request a new quote and
build the swap from that result.

# Aggregator Contract Interface

## Tags corresponding to different networks

| Contract                  | Tag of Repo | Latest published at address                                        |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| CetusAggregatorV2         | mainnet     | 0x550ee36ade22b4193242ad6fb52c09b4b7185a3f678b1c074d5714040af0bf63 |
| CetusAggregatorV2ExtendV1 | mainnet     | 0x2edc22bf96c85482b2208624fa9339255d5055113c92fd6c33add48ce971b774 |
| CetusAggregatorV2ExtendV2 | mainnet     | 0x2e227a3cbc6715518b18ed339d2f967153674b7b257da114ca62c72b2011258a |

## Example

```
CetusAggregatorV2 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2/mainnet", rev = "mainnet-v1.64.0", override = true }

CetusAggregatorV2ExtendV1 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2-extend-v1", rev = "mainnet-v1.64.0", override = true }

CetusAggregatorV2ExtendV2 = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2-extend-v2", rev = "mainnet-v1.64.0", override = true }
```

# Simple Aggregator Contract Interface

- include: cetus, flowxv3, turbos, bluefin, haedalhmm, momentum, obric, deepbookv3

## Tags corresponding to different networks

| Contract              | Tag of Repo | Latest published at address                                        |
| --------------------- | ----------- | ------------------------------------------------------------------ |
| CetusAggregatorSimple | mainnet-v1.65.0 | 0x7a1621f6dad0de46fb3b5b665896e46b310ad8264d8aab304c1e554f844e02a5 |

## Example

```
CetusAggregatorSimple = { git = "https://github.com/CetusProtocol/aggregator.git", subdir = "packages/cetus-aggregator-v2/simple-mainnet", rev = "mainnet-v1.65.0", override = true }
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
