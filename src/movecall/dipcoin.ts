import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { DexRouter } from "."
import { Env, FlattenedPath } from ".."
import { AGGREGATOR_V3_CONFIG } from "../const"

export const DIPCOIN_GLOBAL = "0x935229a3c32399e9fb207ec8461a54f56c6af5744c64442435ac217ab28f0d59"

export class DipcoinRouter implements DexRouter {
  constructor(env: Env) {
    if (env !== Env.Mainnet) throw new Error("DipCoin only supported on mainnet")
  }

  swap(txb: Transaction, flattenedPath: FlattenedPath, swapContext: TransactionObjectArgument) {
    const { path, isLastUseOfIntermediateToken } = flattenedPath
    if (!path.publishedAt) throw new Error("DipCoin not set publishedAt")
    const shared = (id: string, mutable: boolean) => {
      const version = path.extendedDetails?.aux_shared_versions?.[id]
      return version == null ? txb.object(id) : txb.sharedObjectRef({
        objectId: id, initialSharedVersion: version, mutable,
      })
    }
    txb.moveCall({
      target: `${path.publishedAt}::dipcoin::swap`,
      typeArguments: path.direction ? [path.from, path.target] : [path.target, path.from],
      arguments: [swapContext, shared(DIPCOIN_GLOBAL, false), shared(path.id, true),
        txb.pure.bool(path.direction),
        txb.pure.u64(isLastUseOfIntermediateToken ? AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN : path.amountIn)],
    })
  }
}
