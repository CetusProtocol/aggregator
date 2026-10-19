import { bcs } from "@mysten/sui/bcs"
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import BN from "bn.js"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
  getRebalanceRouterResult,
  getRouterResult,
} from "../../src/api"
import { AggregatorClient } from "../../src/client"
import { CetusTideRouter } from "../../src/movecall/cetus_tide"
import type {
  FlattenedPath,
  RebalanceRouterData,
} from "../../src/types/shared"

const PUBLISHED_AT = `0x${"aa".repeat(32)}`
const VERSIONED = `0x${"bb".repeat(32)}`
const GLOBAL_CONFIG = `0x${"cc".repeat(32)}`
const MM = `0x${"dd".repeat(32)}`
const POOL = `0x${"ee".repeat(32)}`
const SWAP_CONTEXT = `0x${"ff".repeat(32)}`
const BASE = "0x2::base::BASE"
const QUOTE = "0x2::quote::QUOTE"
const ENVELOPE = `0x${"01".repeat(64)}`
const SIGNATURE_A = `0x${"11".repeat(96)}`
const SIGNATURE_B = `0x${"22".repeat(96)}`
const QUOTE_HASH = `0x${"33".repeat(32)}`
const REBALANCE_QUOTE_BCS = `0x${"44".repeat(64)}`

afterEach(() => {
  vi.unstubAllGlobals()
})

function route(
  orderbookVersion?: number,
  signatures?: string[],
  direction = true
): FlattenedPath {
  return {
    isLastUseOfIntermediateToken: false,
    path: {
      id: POOL,
      direction,
      provider: "CETUS_TIDE",
      from: direction ? BASE : QUOTE,
      target: direction ? QUOTE : BASE,
      feeRate: 0,
      amountIn: "123",
      amountOut: "456",
      publishedAt: PUBLISHED_AT,
      extendedDetails: {
        cetus_tide_fill: {
          envelope: ENVELOPE,
          ...(orderbookVersion === 2 || signatures
            ? {}
            : { signature: SIGNATURE_A }),
          signatures,
          quote_hash: QUOTE_HASH,
          sig_expiry_ms: "9999999999999",
        },
        cetus_tide_mm_object_id: MM,
        cetus_tide_versioned: VERSIONED,
        cetus_tide_global_config: GLOBAL_CONFIG,
        cetus_tide_orderbook_version: orderbookVersion,
      },
    },
  }
}

function pureBytes(tx: Transaction, argument: unknown): Uint8Array {
  const inputIndex = (argument as { Input: number }).Input
  const input = tx.getData().inputs[inputIndex] as {
    Pure: { bytes: string }
  }
  return Uint8Array.from(Buffer.from(input.Pure.bytes, "base64"))
}

function rebalanceRoute(): RebalanceRouterData {
  return {
    quoteID: "rebalance-v2",
    amountIn: new BN(123),
    amountOut: new BN(456),
    byAmountIn: true,
    insufficientLiquidity: false,
    deviationRatio: 0,
    paths: [
      {
        id: POOL,
        direction: true,
        provider: "CETUS",
        from: BASE,
        target: QUOTE,
        feeRate: 0,
        amountIn: "123",
        amountOut: "456",
        publishedAt: PUBLISHED_AT,
      },
    ],
    packages: new Map([["aggregator_v3", SWAP_CONTEXT]]),
    rebalanceQuoteBcs: REBALANCE_QUOTE_BCS,
    rebalanceQuoteSignature: SIGNATURE_A,
    rebalanceQuote: {
      domain: "PQF_REBALANCE_QUOTE_V1",
      coinIn: BASE,
      coinOut: QUOTE,
      amountIn: "123",
      amountOut: "456",
      issuedAtMs: "1000",
      expiryMs: "31000",
      signerVersion: "1",
    },
  }
}

describe("CetusTideRouter", () => {
  test("keeps legacy responses without a version on the V1 adapter", () => {
    const tx = new Transaction()
    new CetusTideRouter().swap(tx, route(), tx.object(SWAP_CONTEXT))

    const call = tx.getData().commands[0].MoveCall!
    expect(call.package).toBe(PUBLISHED_AT)
    expect(call.module).toBe("orderbook")
    expect(call.function).toBe("swap")
    expect(call.typeArguments).toEqual([BASE, QUOTE])
    expect(call.arguments).toHaveLength(12)
    expect(
      bcs.vector(bcs.u8()).parse(pureBytes(tx, call.arguments[6]))
    ).toEqual(Array.from(Buffer.from(SIGNATURE_A.slice(2), "hex")))
  })

  test("dispatches an explicit V1 response to the orderbook adapter", () => {
    const tx = new Transaction()
    new CetusTideRouter().swap(tx, route(1), tx.object(SWAP_CONTEXT))

    const call = tx.getData().commands[0].MoveCall!
    expect(call.module).toBe("orderbook")
    expect(call.function).toBe("swap")
    expect(call.arguments).toHaveLength(12)
  })

  test("dispatches V2 and BCS-encodes the complete signature bundle", () => {
    const tx = new Transaction()
    new CetusTideRouter().swap(
      tx,
      route(2, [SIGNATURE_A, SIGNATURE_B], false),
      tx.object(SWAP_CONTEXT)
    )

    const call = tx.getData().commands[0].MoveCall!
    expect(call.package).toBe(PUBLISHED_AT)
    expect(call.module).toBe("orderbook_v2")
    expect(call.function).toBe("swap")
    expect(call.typeArguments).toEqual([BASE, QUOTE])
    expect(call.arguments).toHaveLength(11)

    const signatureBundle = bcs
      .vector(bcs.vector(bcs.u8()))
      .parse(pureBytes(tx, call.arguments[6]))
    expect(signatureBundle).toEqual([
      Array.from(Buffer.from(SIGNATURE_A.slice(2), "hex")),
      Array.from(Buffer.from(SIGNATURE_B.slice(2), "hex")),
    ])
    expect(
      bcs.vector(bcs.u8()).parse(pureBytes(tx, call.arguments[9]))
    ).toEqual(Array.from(Buffer.from(QUOTE_HASH.slice(2), "hex")))
  })

  test("infers the V2 adapter from signatures for a versionless response", () => {
    const tx = new Transaction()
    new CetusTideRouter().swap(
      tx,
      route(undefined, [SIGNATURE_A, SIGNATURE_B]),
      tx.object(SWAP_CONTEXT)
    )

    const call = tx.getData().commands[0].MoveCall!
    expect(call.module).toBe("orderbook_v2")
    expect(call.function).toBe("swap")
    expect(call.arguments).toHaveLength(11)
  })

  test("rejects a V2 route without the canonical signature bundle", () => {
    const tx = new Transaction()
    expect(() =>
      new CetusTideRouter().swap(tx, route(2), tx.object(SWAP_CONTEXT))
    ).toThrow("signatures must be a non-empty canonical bundle")
  })

  test("rejects unsupported orderbook versions", () => {
    const tx = new Transaction()
    expect(() =>
      new CetusTideRouter().swap(
        tx,
        route(3, [SIGNATURE_A]),
        tx.object(SWAP_CONTEXT)
      )
    ).toThrow("unsupported orderbook version 3")
  })

  test("rejects malformed signature lengths before building the MoveCall", () => {
    const tx = new Transaction()
    expect(() =>
      new CetusTideRouter().swap(
        tx,
        route(2, ["0x1234"]),
        tx.object(SWAP_CONTEXT)
      )
    ).toThrow("signatures[0] must be 96 bytes, got 2")
    expect(tx.getData().commands).toHaveLength(0)
  })
})

describe("Cetus Tide V2 API payload", () => {
  test("requests the V2-capable SDK version and preserves the signature bundle", async () => {
    let requestedUrl = ""
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      requestedUrl = input.toString()
      return new Response(
        JSON.stringify({
          code: 200,
          msg: "Success",
          data: {
            request_id: "quote-v2",
            amount_in: "123",
            amount_out: "456",
            deviation_ratio: 0,
            paths: [
              {
                id: POOL,
                direction: true,
                provider: "CETUS_TIDE",
                from: BASE,
                target: QUOTE,
                fee_rate: 0,
                amount_in: "123",
                amount_out: "456",
                published_at: PUBLISHED_AT,
                extended_details: {
                  cetus_tide_fill: {
                    envelope: ENVELOPE,
                    signatures: [SIGNATURE_A, SIGNATURE_B],
                    quote_hash: QUOTE_HASH,
                    sig_expiry_ms: "9999999999999",
                  },
                  cetus_tide_mm_object_id: MM,
                  cetus_tide_versioned: VERSIONED,
                  cetus_tide_global_config: GLOBAL_CONFIG,
                  cetus_tide_orderbook_version: 2,
                },
              },
            ],
            packages: { aggregator_v3: SWAP_CONTEXT },
          },
        }),
        { status: 200 }
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await getRouterResult(
      "https://example.com/router_v3",
      "",
      {
        from: BASE,
        target: QUOTE,
        amount: new BN(123),
        byAmountIn: true,
        providers: ["CETUS_TIDE"],
      },
      0,
      "0x0"
    )

    expect(requestedUrl).toContain("v=1010609")
    expect(result?.paths[0].extendedDetails?.cetus_tide_orderbook_version).toBe(
      2
    )
    expect(
      result?.paths[0].extendedDetails?.cetus_tide_fill?.signatures
    ).toEqual([SIGNATURE_A, SIGNATURE_B])
    expect(
      result?.paths[0].extendedDetails?.cetus_tide_fill?.signature
    ).toBeUndefined()
  })

  test("uses the dedicated rebalance endpoint and parses its signed quote", async () => {
    let requestedUrl = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        requestedUrl = input.toString()
        return new Response(
          JSON.stringify({
            code: 200,
            msg: "Success",
            data: {
              request_id: "rebalance-v2",
              amount_in: "123",
              amount_out: "456",
              deviation_ratio: 0,
              paths: [
                {
                  id: POOL,
                  direction: true,
                  provider: "CETUS",
                  from: BASE,
                  target: QUOTE,
                  fee_rate: 0,
                  amount_in: "123",
                  amount_out: "456",
                  published_at: PUBLISHED_AT,
                },
              ],
              packages: { aggregator_v3: SWAP_CONTEXT },
              rebalance_quote_bcs: REBALANCE_QUOTE_BCS,
              rebalance_quote_signature: SIGNATURE_A,
              rebalance_quote: {
                domain: "PQF_REBALANCE_QUOTE_V1",
                coin_in: BASE,
                coin_out: QUOTE,
                amount_in: "123",
                amount_out: "456",
                issued_at_ms: "1000",
                expiry_ms: "31000",
                signer_version: "1",
              },
            },
          }),
          { status: 200 }
        )
      })
    )

    const result = await getRebalanceRouterResult(
      "https://example.com/router_v3",
      "rebalance key",
      {
        from: BASE,
        target: QUOTE,
        amount: new BN(123),
        byAmountIn: true,
        providers: ["CETUS"],
      }
    )

    expect(requestedUrl).toContain("/router_v3/rebalance/find_routes?")
    expect(requestedUrl).toContain("apikey=rebalance%20key")
    expect(requestedUrl).toContain("v=1010609")
    expect(result?.rebalanceQuoteBcs).toBe(REBALANCE_QUOTE_BCS)
    expect(result?.rebalanceQuote).toMatchObject({
      coinIn: BASE,
      coinOut: QUOTE,
      amountIn: "123",
      amountOut: "456",
      signerVersion: "1",
    })
  })
})

describe("PQF V2 rebalance PTB", () => {
  test("composes begin, aggregator swap, and finish in one transaction", async () => {
    const client = new AggregatorClient({
      endpoint: "https://example.com/router_v3",
    })
    vi.spyOn(client, "routerSwap").mockImplementation(async ({ txb }) =>
      (txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [QUOTE],
        arguments: [],
      }) as TransactionObjectArgument)
    )
    const tx = new Transaction()

    await client.rebalanceSwap({
      router: rebalanceRoute(),
      slippage: 0.01,
      txb: tx,
      pqfPublishedAt: PUBLISHED_AT,
      versionedObjectId: VERSIONED,
      globalConfigObjectId: GLOBAL_CONFIG,
      marketMakerObjectId: MM,
      poolObjectId: POOL,
      baseCoinType: BASE,
      quoteCoinType: QUOTE,
    })

    const commands = tx.getData().commands
    expect(commands).toHaveLength(5)
    expect(commands[0].MoveCall?.module).toBe("orderbook_v2")
    expect(commands[0].MoveCall?.function).toBe(
      "begin_rebalance_base_to_quote"
    )
    expect(commands[0].MoveCall?.arguments).toHaveLength(8)
    expect(commands[1].MoveCall?.module).toBe("coin")
    expect(commands[1].MoveCall?.function).toBe("from_balance")
    expect(commands[3].MoveCall?.function).toBe("into_balance")
    expect(commands[4].MoveCall?.module).toBe("orderbook_v2")
    expect(commands[4].MoveCall?.function).toBe(
      "finish_rebalance_base_to_quote"
    )
    expect(commands[4].MoveCall?.arguments).toHaveLength(5)
  })

  test("rejects a route that differs from the signed amounts before borrowing", async () => {
    const client = new AggregatorClient({
      endpoint: "https://example.com/router_v3",
    })
    const router = rebalanceRoute()
    router.amountOut = new BN(455)
    const tx = new Transaction()

    await expect(
      client.rebalanceSwap({
        router,
        slippage: 0.01,
        txb: tx,
        pqfPublishedAt: PUBLISHED_AT,
        versionedObjectId: VERSIONED,
        globalConfigObjectId: GLOBAL_CONFIG,
        marketMakerObjectId: MM,
        poolObjectId: POOL,
        baseCoinType: BASE,
        quoteCoinType: QUOTE,
      })
    ).rejects.toThrow("route amountOut does not match the signed quote")
    expect(tx.getData().commands).toHaveLength(0)
  })

  test("selects the quote-to-base entry points from the signed coin direction", async () => {
    const client = new AggregatorClient({
      endpoint: "https://example.com/router_v3",
    })
    vi.spyOn(client, "routerSwap").mockImplementation(async ({ txb }) =>
      (txb.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [BASE],
        arguments: [],
      }) as TransactionObjectArgument)
    )
    const router = rebalanceRoute()
    router.paths[0].from = QUOTE
    router.paths[0].target = BASE
    router.paths[0].direction = false
    router.rebalanceQuote!.coinIn = QUOTE
    router.rebalanceQuote!.coinOut = BASE
    const tx = new Transaction()

    await client.rebalanceSwap({
      router,
      slippage: 0.01,
      txb: tx,
      pqfPublishedAt: PUBLISHED_AT,
      versionedObjectId: VERSIONED,
      globalConfigObjectId: GLOBAL_CONFIG,
      marketMakerObjectId: MM,
      poolObjectId: POOL,
      baseCoinType: BASE,
      quoteCoinType: QUOTE,
    })

    expect(tx.getData().commands[0].MoveCall?.function).toBe(
      "begin_rebalance_quote_to_base"
    )
    expect(tx.getData().commands[4].MoveCall?.function).toBe(
      "finish_rebalance_quote_to_base"
    )
  })
})
