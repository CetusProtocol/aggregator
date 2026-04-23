import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { DEEPBOOK_CLOB_V2_MODULE, DEEPBOOK_CUSTODIAN_V2_MODULE, DEEPBOOK_PACKAGE_ID, DEEPBOOK_PUBLISHED_AT } from "../const"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"

export type GetOrCreateAccountCapResult = {
  accountCap: TransactionObjectArgument,
  isCreate: boolean
}

export async function getOrCreateAccountCap(txb: Transaction, client: SuiJsonRpcClient, owner: string): Promise<GetOrCreateAccountCapResult> {
  let accountCapStr = await getAccountCap(client, owner)
  if (accountCapStr !== null) {
    return {
      accountCap: txb.object(accountCapStr),
      isCreate: false,
    }
  }

  const accountCap = txb.moveCall({
    target: `${DEEPBOOK_PUBLISHED_AT}::${DEEPBOOK_CLOB_V2_MODULE}::create_account`,
    typeArguments: [],
    arguments: [],
  })

  return {
    accountCap,
    isCreate: true,
  }
}

async function getAccountCap(client: SuiJsonRpcClient, owner: string): Promise<string | null> {
  const limit = 50
  let cursor: string | undefined = undefined

  while (true) {
    const ownedObjects = await client.getOwnedObjects({
      owner,
      cursor,
      limit,
      filter: { StructType: `${DEEPBOOK_PACKAGE_ID}::${DEEPBOOK_CUSTODIAN_V2_MODULE}::AccountCap` },
    })

    if (ownedObjects.data.length !== 0) {
      return ownedObjects.data[0].data?.objectId ?? null
    }

    if (!ownedObjects.hasNextPage) {
      break
    }
    cursor = ownedObjects.nextCursor ?? undefined
  }

  return null
}
