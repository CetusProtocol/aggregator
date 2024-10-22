import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Path } from ".."

export const CLOCK_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000006"

export interface Dex {
  swap(
    client: AggregatorClient,
    ptb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    deepbookv3DeepFee?: TransactionObjectArgument
  ): Promise<TransactionObjectArgument>
}
