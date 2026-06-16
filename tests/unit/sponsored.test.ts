import dotenv from "dotenv"
import { describe, expect, test } from "vitest"
import BN from "bn.js"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { SuiGrpcClient } from "@mysten/sui/grpc"
import { fromBase64, SUI_TYPE_ARG } from "@mysten/sui/utils"
import { Transaction } from "@mysten/sui/transactions"
import { AggregatorClient, Env } from "~/index"
import * as testData from "../test_data"

dotenv.config()

const userSecret = process.env.SUI_WALLET_SECRET
const sponsorSecret = process.env.SUI_SPONSOR_SECRET
const hasSponsoredSecrets = Boolean(userSecret && sponsorSecret)

const runSponsoredTest = hasSponsoredSecrets ? test : test.skip

function keypairFromBase64Secret(secret: string): Ed25519Keypair {
  const bytes = fromBase64(secret)
  return Ed25519Keypair.fromSecretKey(
    bytes.length === 33 ? bytes.slice(1, 33) : bytes
  )
}

describe("Sponsored transactions", () => {
  runSponsoredTest(
    "executes a real sponsored SUI -> USDC swap",
    async () => {
      const userSigner = keypairFromBase64Secret(userSecret!)
      const sponsorSigner = keypairFromBase64Secret(sponsorSecret!)
      const sender = userSigner.toSuiAddress()
      const sponsor = sponsorSigner.toSuiAddress()

      expect(sender).not.toBe(sponsor)

      const network = "mainnet"
      const grpcUrl =
        process.env.SUI_RPC || "https://fullnode.mainnet.sui.io:443"
      const suiClient = new SuiGrpcClient({ network, baseUrl: grpcUrl })
      const client = new AggregatorClient({
        endpoint:
          process.env.CETUS_AGGREGATOR_V3 ||
          "https://api-sui.cetus.zone/router_v3",
        signer: sender,
        client: suiClient,
        env: Env.Mainnet,
        pythUrls: ["https://hermes.pyth.network"],
      })

      const amountIn = new BN(
        process.env.SPONSORED_SWAP_AMOUNT || "1000000"
      )
      const gasBudget = process.env.SPONSORED_GAS_BUDGET || "100000000"

      const [senderBalance, sponsorGasCoins, router] = await Promise.all([
        suiClient.getBalance({ owner: sender, coinType: SUI_TYPE_ARG }),
        suiClient.listCoins({
          owner: sponsor,
          coinType: SUI_TYPE_ARG,
          limit: 5,
        }),
        client.findRouters({
          from: testData.M_SUI,
          target: testData.M_USDC,
          amount: amountIn,
          byAmountIn: true,
          depth: 1,
          providers: ["CETUS"],
        }),
      ])

      expect(BigInt(senderBalance.balance.balance)).toBeGreaterThanOrEqual(
        BigInt(amountIn.toString())
      )
      expect(router).toBeDefined()

      const sponsorCoins = sponsorGasCoins.objects
        .filter((coin) => BigInt(coin.balance) >= BigInt(gasBudget))
        .slice(0, 1)
        .map((coin) => ({
          objectId: coin.objectId,
          version: coin.version,
          digest: coin.digest,
        }))

      expect(sponsorCoins.length).toBe(1)

      const txb = new Transaction()
      await client.fastRouterSwap({
        router: router!,
        txb,
        slippage: 0.05,
        sponsored: true,
      })

      const txKindBytes = await client.buildTransactionKind(txb, sender)
      const sponsoredTx = client.buildSponsoredTransaction({
        txKindBytes,
        sender,
        sponsor,
        sponsorCoins,
        gasBudget,
      })

      const result = await client.signAndExecuteSponsoredTransaction(
        sponsoredTx,
        userSigner,
        sponsorSigner
      )

      if (result.$kind !== "Transaction") {
        throw new Error(
          result.FailedTransaction.status.error?.message ||
            "Sponsored transaction failed"
        )
      }

      const executed = result.Transaction
      expect(executed.status.success).toBe(true)
      expect(executed.effects?.gasObject?.outputOwner).toMatchObject({
        AddressOwner: sponsor,
      })
      expect(
        executed.balanceChanges?.some(
          (change) =>
            change.address === sender &&
            change.coinType === testData.M_USDC &&
            BigInt(change.amount) > 0n
        )
      ).toBe(true)
    },
    120000
  )
})
