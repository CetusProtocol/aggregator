// Copyright 2025 0xBondSui <sugar@cetus.zone>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { fromHex, SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { DexRouter, Extends } from "."
import { ExtendedDetails, FlattenedPath, CetusTideFill } from ".."
import * as Constants from "../const"

export class CetusTideRouter implements DexRouter {
  swap(
    txb: Transaction,
    flattenedPath: FlattenedPath,
    swapContext: TransactionObjectArgument,
    _extends?: Extends
  ) {
    const path = flattenedPath.path

    if (!path.extendedDetails) {
      throw new Error("Cetus Tide: extended_details missing on path")
    }
    if (path.publishedAt == null) {
      throw new Error("Cetus Tide: path.publishedAt missing")
    }

    const ed = path.extendedDetails
    const fill = this.validateFill(ed)
    const mmObjectId = ed.cetus_tide_mm_object_id!
    const versioned = ed.cetus_tide_versioned!
    const globalConfig = ed.cetus_tide_global_config!

    const [baseCoinType, quoteCoinType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    const envelopeBytes = Array.from(fromHex(fill.envelope))
    const signatureBytes = Array.from(fromHex(fill.signature))
    // request_id reuses quote_hash bytes — the tide tracker writes request_id
    // into ConsumeExecutedEvent.layer_fills to correlate fills with aggregator quotes.
    const quoteHashBytes = Array.from(fromHex(fill.quote_hash))

    const args = [
      swapContext,
      txb.object(versioned),
      txb.object(globalConfig),
      txb.object(mmObjectId),
      txb.object(path.id),
      txb.pure.vector("u8", envelopeBytes),
      txb.pure.vector("u8", signatureBytes),
      txb.pure.vector("u8", quoteHashBytes),
      txb.pure.u64(amountIn.toString()),
      txb.pure.bool(path.direction),
      txb.pure.vector("u8", quoteHashBytes),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ]

    txb.moveCall({
      target: `${path.publishedAt}::orderbook::swap`,
      typeArguments: [baseCoinType, quoteCoinType],
      arguments: args,
    })
  }

  private validateFill(ed: ExtendedDetails): CetusTideFill {
    if (!ed.cetus_tide_fill) {
      throw new Error("Cetus Tide: cetus_tide_fill missing")
    }
    if (!ed.cetus_tide_mm_object_id) {
      throw new Error("Cetus Tide: cetus_tide_mm_object_id missing")
    }
    if (!ed.cetus_tide_versioned) {
      throw new Error("Cetus Tide: cetus_tide_versioned missing")
    }
    if (!ed.cetus_tide_global_config) {
      throw new Error("Cetus Tide: cetus_tide_global_config missing")
    }
    return ed.cetus_tide_fill
  }
}
