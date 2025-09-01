import { Transaction } from "@mysten/sui/transactions"

export async function printTransaction(tx: Transaction, isPrint = true) {
  console.log(`inputs`, tx.getData().inputs)
  let i = 0

  tx.getData().commands.forEach((item, index) => {
    if (isPrint) {
      console.log(
        `transaction ${index}: `,
        JSON.stringify(item, bigIntReplacer, 2)
      )
      i++
    }
  })
}

function bigIntReplacer(key: string, value: any) {
  if (typeof value === "bigint") {
    return value.toString()
  }
  return value
}

export function checkInvalidSuiAddress(address: string): boolean {
  if (!address.startsWith("0x") || address.length !== 66) {
    return false
  }
  return true
}
