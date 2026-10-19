import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import {
  setupTestClient,
  testData,
  unwrapSimulation,
  printTransaction,
} from "./setup"
import BN from "bn.js"
import Decimal from "decimal.js"
import { Transaction } from "@mysten/sui/transactions"

const CETUS_TIDE_ENDPOINT =
  "https://api-sui-cloudfront.cetus.zone/router_v3"

async function findAndSimulateTideSwap(params: {
  client: AggregatorClient
  scenario: string
  from: string
  target: string
  amount: string
}) {
  const { client, scenario, from, target, amount } = params
  const scenarioLabel = `CETUS_TIDE ${scenario}`
  const slippageTolerance = 0.005

  const res = await client.findRouters({
    from,
    target,
    amount: new BN(amount),
    byAmountIn: true,
    depth: 3,
    providers: ["CETUS_TIDE"],
  })

  console.log(`${scenarioLabel} res`, JSON.stringify(res, null, 2))
  console.log(`${scenarioLabel} route`, JSON.stringify(res?.paths, null, 2))

  expect(res, `${scenarioLabel} quote was not returned`).not.toBeNull()
  if (!res) {
    throw new Error(`${scenarioLabel} quote was not returned`)
  }

  expect(res.paths.length, `${scenarioLabel} route is empty`).toBeGreaterThan(0)
  const tidePath = res.paths.find(path => path.provider === "CETUS_TIDE")
  expect(tidePath, "CETUS_TIDE path missing from quote").toBeDefined()
  const returnedVersion =
    tidePath?.extendedDetails?.cetus_tide_orderbook_version
  const fill = tidePath?.extendedDetails?.cetus_tide_fill
  const version =
    returnedVersion === 2 ||
    (returnedVersion == null && (fill?.signatures?.length ?? 0) > 0)
      ? 2
      : 1
  const label = `${scenarioLabel} V${version}`

  if (version === 1) {
    expect(fill?.signature, "CETUS_TIDE V1 signature is missing").toBeTruthy()
  } else {
    expect(
      fill?.signatures?.length ?? 0,
      "CETUS_TIDE V2 signature bundle is missing"
    ).toBeGreaterThan(0)
  }

  const txb = new Transaction()
  await client.fastRouterSwap({
    router: res,
    txb,
    slippage: slippageTolerance,
    refreshAllCoins: true,
  })
  printTransaction(txb)

  const expectedModule = version === 1 ? "orderbook" : "orderbook_v2"
  const swapCall = txb
    .getData()
    .commands.find(
      command =>
        command.MoveCall?.module === expectedModule &&
        command.MoveCall.function === "swap"
    )
  expect(
    swapCall,
    `Transaction did not dispatch ${label} to ${expectedModule}::swap`
  ).toBeDefined()
  expect(swapCall!.MoveCall?.package).toBe(tidePath!.publishedAt)

  const rawResult = await client.devInspectTransactionBlock(txb)
  const result = unwrapSimulation(rawResult)
  expect(
    result.success,
    result.error ? JSON.stringify(result.error) : undefined
  ).toBe(true)

  const confirmSwapEvent = result.events.find(
    event =>
      event.eventType.endsWith("::router::ConfirmSwapEvent") ||
      event.eventType.endsWith("::router::ConfirmSwapEventV3")
  )
  expect(
    confirmSwapEvent,
    "ConfirmSwapEvent or ConfirmSwapEventV3 missing from simulation"
  ).toBeDefined()

  const simulatedSwap = confirmSwapEvent!.json as {
    amount_in?: string
    amount_out?: string
  }
  expect(simulatedSwap.amount_in, "Simulation amount_in missing").toBeDefined()
  expect(simulatedSwap.amount_out, "Simulation amount_out missing").toBeDefined()

  console.log(`${label} quote - amount in: ${res.amountIn.toString()}`)
  console.log(`${label} quote - amount out: ${res.amountOut.toString()}`)
  console.log(`${label} simulation - amount in: ${simulatedSwap.amount_in}`)
  console.log(`${label} simulation - amount out: ${simulatedSwap.amount_out}`)

  const quoteAmountOut = new Decimal(res.amountOut.toString())
  const simulationAmountOut = new Decimal(simulatedSwap.amount_out!)
  const simulationSlippage = quoteAmountOut
    .minus(simulationAmountOut)
    .div(quoteAmountOut)
  const simulationSlippagePercent = simulationSlippage.mul(100)

  console.log(
    `${label} quote-to-simulation slippage: ${simulationSlippagePercent.toFixed(6)}%`
  )
  expect(
    simulationSlippage.lte(slippageTolerance),
    `Simulation slippage ${simulationSlippagePercent.toFixed(6)}% exceeds tolerance ${new Decimal(slippageTolerance).mul(100).toFixed(2)}%`
  ).toBe(true)

  console.log(`[OK] ${label}: Transaction simulation successful`)
}

describe("CETUS_TIDE Router", () => {
  let suiToUsdcClient: AggregatorClient
  let usdcToSuiClient: AggregatorClient

  beforeAll(async () => {
    const [suiToUsdcSetup, usdcToSuiSetup] = await Promise.all([
      setupTestClient(testData.M_SUI, CETUS_TIDE_ENDPOINT),
      setupTestClient(testData.M_USDC, CETUS_TIDE_ENDPOINT),
    ])
    suiToUsdcClient = suiToUsdcSetup.client
    usdcToSuiClient = usdcToSuiSetup.client
  })

  test("CETUS_TIDE - simulate SUI to USDC", async () => {
    await findAndSimulateTideSwap({
      client: suiToUsdcClient,
      scenario: "SUI -> USDC",
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: "1000000000",
    })
  }, 600000)

  test("CETUS_TIDE - simulate USDC to SUI", async () => {
    await findAndSimulateTideSwap({
      client: usdcToSuiClient,
      scenario: "USDC -> SUI",
      from: testData.M_USDC,
      target: testData.M_SUI,
      amount: "1000000",
    })
  }, 600000)
})
