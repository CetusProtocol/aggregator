import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, Path } from ".."
import { SuiClient } from "@mysten/sui/client"

const DEEPBOOK_PACKAGE_ID =
  "0x000000000000000000000000000000000000000000000000000000000000dee9"

type GetOrCreateAccountCapResult = {
  accountCap: TransactionObjectArgument
  isCreate: boolean
}

export class DeepbookV2 implements Dex {
  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Aftermath only supported on mainnet")
    }
  }

  async getAccountCap(
    client: SuiClient,
    owner: string
  ): Promise<string | null> {
    let limit = 50
    let cursor = null

    while (true) {
      const ownedObjects: any = client.getOwnedObjects({
        owner,
        cursor,
        limit,
        filter: {
          MoveModule: {
            package: DEEPBOOK_PACKAGE_ID,
            module: "custodian_v2",
          },
        },
      })

      if (ownedObjects != null && ownedObjects.data != null) {
        if (ownedObjects.data.length !== 0) {
          return ownedObjects.data[0].data.objectId
        }

        if (ownedObjects.data.length < 50) {
          break
        }
      } else {
        break
      }
    }

    return null
  }

  async getOrCreateAccountCap(
    txb: Transaction,
    client: SuiClient,
    owner: string
  ): Promise<GetOrCreateAccountCapResult> {
    let accountCapStr = await this.getAccountCap(client, owner)
    if (accountCapStr !== null) {
      return {
        accountCap: txb.object(accountCapStr),
        isCreate: false,
      }
    }

    const accountCap = txb.moveCall({
      target: `${DEEPBOOK_PACKAGE_ID}::clob_v2::create_account`,
      typeArguments: [],
      arguments: [],
    })

    return {
      accountCap,
      isCreate: true,
    }
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    const accountCapRes = await this.getOrCreateAccountCap(
      txb,
      client.client,
      client.signer
    )

    const args = [
      txb.object(path.id),
      inputCoin,
      accountCapRes.accountCap,
      txb.object(CLOCK_ADDRESS),
    ]

    const res = txb.moveCall({
      target: `${client.publishedAt()}::deepbook::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    if (accountCapRes.isCreate) {
      txb.transferObjects([accountCapRes.accountCap], client.signer)
    }

    return res
  }
}
