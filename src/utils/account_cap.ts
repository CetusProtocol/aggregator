import { SuiGrpcClient } from "@mysten/sui/grpc"
import { DEEPBOOK_CLOB_V2_MODULE, DEEPBOOK_CUSTODIAN_V2_MODULE, DEEPBOOK_PACKAGE_ID, DEEPBOOK_PUBLISHED_AT } from "../const"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"

export type GetOrCreateAccountCapResult = {
  accountCap: TransactionObjectArgument,
  isCreate: boolean
}

export async function getOrCreateAccountCap(txb: Transaction, client: SuiGrpcClient, owner: string): Promise<GetOrCreateAccountCapResult> {
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

async function getAccountCap(client: SuiGrpcClient, owner: string): Promise<string | null> {
  const limit = 50
  let cursor: string | null = null

  while (true) {
    const ownedObjects: Awaited<ReturnType<SuiGrpcClient['listOwnedObjects']>> = await client.listOwnedObjects({
      owner,
      cursor,
      limit,
      type: `${DEEPBOOK_PACKAGE_ID}::${DEEPBOOK_CUSTODIAN_V2_MODULE}::AccountCap`,
    })

    if (ownedObjects.objects.length !== 0) {
      return ownedObjects.objects[0].objectId
    }

    if (!ownedObjects.hasNextPage) {
      break
    }
    cursor = ownedObjects.cursor
  }

  return null
}
