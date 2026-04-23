import { describe, test, beforeAll, expect } from "vitest"
import { AggregatorClient } from "~/index"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import {
  setupTestClient,
  testDexRouter,
  testData,
  printTransaction,
  unwrapSimulation,
} from "./setup"
import BN from "bn.js"
import { Transaction, coinWithBalance } from "@mysten/sui/transactions"

describe("CETUS Router", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  test("All dexs router - find and swap", async () => {
    const setup = await setupTestClient(testData.M_DEEP)
    client = setup.client
    keypair = setup.keypair
    await testDexRouter(
      client,
      [],
      testData.M_DEEP,
      testData.M_USDC,
      "2000000000",
      true
    )
  }, 30000)

  test("By amount out", async () => {
    const amount = "1000000"

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: false,
      providers: ["CETUS"],
    })

    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res!,
      txb,
      slippage: 0.05, // 5% slippage tolerance
      refreshAllCoins: true,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(`✅ Transaction simulation successful`)
    } else {
      console.log(`❌ Transaction simulation failed`)
      console.log("Error:", result.error)
    }
  }, 600000)

  test("Downgrade", async () => {
    const amount = "1000000000"

    const res = await client.swapInPools({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: new BN(amount),
      byAmountIn: true,
      pools: [
        "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        "0x7f9719a9fdd200b6f65bcef7fb3e2992ecd7aca5331a1b4a7a6a38dd4d1aa282",
      ],
    })

    const txb = new Transaction()

    await client.fastRouterSwap({
      router: res!.routeData!,
      txb,
      slippage: 0.05, // 5% slippage tolerance
      refreshAllCoins: true,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(`✅ Transaction simulation successful`)
    } else {
      console.log(`❌ Transaction simulation failed`)
      console.log("Error:", result.error)
    }
  }, 50000)
})

describe("Router Swap with Max Amount In Validation", () => {
  let client: AggregatorClient
  let keypair: Ed25519Keypair | null

  beforeAll(async () => {
    const setup = await setupTestClient()
    client = setup.client
    keypair = setup.keypair
  })

  /**
   * Test Case 1: Input coin value equals maxAmountIn
   * Expected: Transaction should succeed
   */
  test("Should succeed when input coin value equals maxAmountIn", async () => {
    const amount = new BN("1000000000") // 1 SUI
    const maxAmountIn = new BN("1000000000") // Exact match

    // Find router
    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    expect(res?.paths).toBeDefined()
    expect(res?.paths.length).toBeGreaterThan(0)

    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)

    const txb = new Transaction()

    // Build input coin with exact amount
    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    // Execute swap with maxAmountIn validation
    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    // Simulate transaction
    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(
        "✅ Transaction simulation successful - coin value equals maxAmountIn"
      )
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 2: Input coin value is less than maxAmountIn
   * Expected: Transaction should succeed
   */
  test("Should succeed when input coin value is less than maxAmountIn", async () => {
    const amount = new BN("500000000") // 0.5 SUI
    const maxAmountIn = new BN("1000000000") // 1 SUI (double the amount)

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(
        "✅ Transaction simulation successful - coin value less than maxAmountIn"
      )
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 3: Input coin value exceeds maxAmountIn
   * Expected: Transaction should fail with max amount validation error
   */
  test("Should fail when input coin value exceeds maxAmountIn", async () => {
    const amount = new BN("2000000000") // 2 SUI
    const maxAmountIn = new BN("1000000000") // 1 SUI (half the amount)

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (!result.success) {
      console.log(
        "✅ Transaction correctly failed - coin value exceeds maxAmountIn"
      )
      console.log("Error:", result.error)
    } else {
      console.log("⚠️ Transaction unexpectedly succeeded")
    }

    // Expect transaction to fail
    expect(result.success).toBe(false)
  }, 60000)

  /**
   * Test Case 4: Minimal amount with strict maxAmountIn
   * Expected: Transaction should succeed
   */
  test("Should succeed with minimal amount and strict maxAmountIn", async () => {
    const amount = new BN("100000000") // 0.1 SUI
    const maxAmountIn = new BN("100000000") // Exact match

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(
        "✅ Transaction simulation successful - minimal amount with strict limit"
      )
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 5: Large amount with generous maxAmountIn
   * Expected: Transaction should succeed
   */
  test("Should succeed with large amount and generous maxAmountIn", async () => {
    const amount = new BN("5000000000") // 5 SUI
    const maxAmountIn = new BN("10000000000") // 10 SUI (generous limit)

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(
        "✅ Transaction simulation successful - large amount with generous limit"
      )
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 6: Fixed output swap with maxAmountIn validation
   * Expected: Transaction should succeed when input doesn't exceed limit
   */
  test("Should succeed for fixed output swap when input is within maxAmountIn", async () => {
    const amountOut = new BN("1000000") // 1 USDC output

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount: amountOut,
      byAmountIn: false, // Fixed output
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in (estimated): ${res.amountIn.toString()}`)
    console.log(`Amount out (fixed): ${res.amountOut.toString()}`)

    // Set maxAmountIn generously to allow the swap
    const maxAmountIn = res.amountIn.mul(new BN(2)) // 2x the estimated input

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(maxAmountIn.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.05,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log(
        "✅ Transaction simulation successful - fixed output with maxAmountIn"
      )
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 7: Edge case - maxAmountIn is 1 (minimal)
   * Expected: Transaction should fail as actual amount will exceed
   */
  test("Should fail when maxAmountIn is too small (edge case)", async () => {
    const amount = new BN("1000000000") // 1 SUI
    const maxAmountIn = new BN("1") // Impossibly small limit

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()} (edge case)`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (!result.success) {
      console.log("✅ Transaction correctly failed - maxAmountIn too small")
      console.log("Error:", result.error)
    } else {
      console.log("⚠️ Transaction unexpectedly succeeded")
    }

    expect(result.success).toBe(false)
  }, 60000)

  /**
   * Test Case 8: Different coin pair with maxAmountIn validation
   * Expected: Transaction should succeed
   */
  test("Should succeed with different coin pair (USDC -> CETUS) and maxAmountIn", async () => {
    const setup = await setupTestClient(testData.M_USDC)
    const testClient = setup.client

    const amount = new BN("1000000") // 1 USDC
    const maxAmountIn = new BN("1500000") // 1.5 USDC

    const res = await testClient.findRouters({
      from: testData.M_USDC,
      target: testData.M_CETUS,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Amount out: ${res.amountOut.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: false,
      type: testData.M_USDC,
    })

    await testClient.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await testClient.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (result.success) {
      console.log("✅ Transaction simulation successful - different coin pair")
    } else {
      console.log("❌ Transaction simulation failed")
      console.log("Error:", result.error)
    }

    expect(result.success).toBe(true)
  }, 60000)

  /**
   * Test Case 9: Off-by-one validation (amount = maxAmountIn + 1)
   * Expected: Transaction should fail
   */
  test("Should fail when input exceeds maxAmountIn by 1 (off-by-one)", async () => {
    const amount = new BN("1000000001") // maxAmountIn + 1
    const maxAmountIn = new BN("1000000000") // 1 SUI

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    console.log(`Amount in: ${res.amountIn.toString()}`)
    console.log(`Max amount in: ${maxAmountIn.toString()}`)
    console.log(`Difference: ${res.amountIn.sub(maxAmountIn).toString()}`)

    const txb = new Transaction()

    const inputCoin = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin,
      slippage: 0.01,
      txb,
      maxAmountIn,
    })

    printTransaction(txb)

    const rawResult = await client.devInspectTransactionBlock(txb)
    const result = unwrapSimulation(rawResult)

    if (!result.success) {
      console.log("✅ Transaction correctly failed - off-by-one validation")
      console.log("Error:", result.error)
    } else {
      console.log("⚠️ Transaction unexpectedly succeeded")
    }

    expect(result.success).toBe(false)
  }, 60000)

  /**
   * Test Case 10: Comparison with regular routerSwap
   * This test demonstrates the difference between routerSwap and routerSwapWithMaxAmountIn
   */
  test("Comparison: routerSwap vs routerSwapWithMaxAmountIn behavior", async () => {
    const amount = new BN("1000000000") // 1 SUI
    const maxAmountIn = new BN("1000000000") // Exact match

    const res = await client.findRouters({
      from: testData.M_SUI,
      target: testData.M_USDC,
      amount,
      byAmountIn: true,
      providers: ["CETUS"],
    })

    expect(res).toBeDefined()
    if (!res) {
      console.log("⚠️ No routes found, skipping test")
      return
    }

    // Test with regular routerSwap
    const txb1 = new Transaction()
    const inputCoin1 = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwap({
      router: res,
      inputCoin: inputCoin1,
      slippage: 0.01,
      txb: txb1,
    })

    const rawResult1 = await client.devInspectTransactionBlock(txb1)
    const result1 = unwrapSimulation(rawResult1)

    // Test with routerSwapWithMaxAmountIn
    const txb2 = new Transaction()
    const inputCoin2 = coinWithBalance({
      balance: BigInt(amount.toString()),
      useGasCoin: true,
      type: testData.M_SUI,
    })

    await client.routerSwapWithMaxAmountIn({
      router: res,
      inputCoin: inputCoin2,
      slippage: 0.01,
      txb: txb2,
      maxAmountIn,
    })

    const rawResult2 = await client.devInspectTransactionBlock(txb2)
    const result2 = unwrapSimulation(rawResult2)

    console.log(`Regular routerSwap: ${result1.success}`)
    console.log(`routerSwapWithMaxAmountIn: ${result2.success}`)

    // Both should succeed with the same amount
    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)

    console.log("✅ Both methods succeed with valid input")
  }, 60000)
})
