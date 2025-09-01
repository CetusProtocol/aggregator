import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { Path } from "../types/shared"
import { AggregatorClient } from "~/client"

export interface Dex {
  swap(
    client: AggregatorClient,
    ptb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>,
    deepbookv3DeepFee?: TransactionObjectArgument
  ): Promise<TransactionObjectArgument>
}
