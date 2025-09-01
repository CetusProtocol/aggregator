import { SuiClient } from "@mysten/sui/client"
import { DEEPBOOK_CLOB_V2_MODULE, DEEPBOOK_CUSTODIAN_V2_MODULE, DEEPBOOK_PACKAGE_ID, DEEPBOOK_PUBLISHED_AT } from "../const"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"

export type GetOrCreateAccountCapResult = {
  accountCap: TransactionObjectArgument,
  isCreate: boolean
}

export async function getOrCreateAccountCap(txb: Transaction, client: SuiClient, owner: string): Promise<GetOrCreateAccountCapResult> {
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

async function getAccountCap(client: SuiClient, owner: string): Promise<string | null> {
  let limit = 50;
  let cursor = null;

  while (true) {
    const ownedObjects: any = client.getOwnedObjects({
      owner,
      cursor,
      limit,
      filter: {
        MoveModule: {
          package: DEEPBOOK_PACKAGE_ID,
          module: DEEPBOOK_CUSTODIAN_V2_MODULE,
        }
      }
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
