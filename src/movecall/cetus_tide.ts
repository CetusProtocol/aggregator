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
    const orderbookVersion = this.resolveOrderbookVersion(ed, fill)
    const mmObjectId = ed.cetus_tide_mm_object_id!
    const versioned = ed.cetus_tide_versioned!
    const globalConfig = ed.cetus_tide_global_config!

    const [baseCoinType, quoteCoinType] = path.direction
      ? [path.from, path.target]
      : [path.target, path.from]

    const amountIn = flattenedPath.isLastUseOfIntermediateToken
      ? Constants.AGGREGATOR_V3_CONFIG.MAX_AMOUNT_IN
      : path.amountIn

    const envelopeBytes = this.decodeHex("envelope", fill.envelope)
    // request_id reuses quote_hash bytes — the tide tracker writes request_id
    // into ConsumeExecutedEvent.layer_fills to correlate fills with aggregator quotes.
    const quoteHashBytes = this.decodeHex("quote_hash", fill.quote_hash, 32)

    if (orderbookVersion === 1) {
      if (!fill.signature) {
        throw new Error(
          "Cetus Tide V1: cetus_tide_fill.signature is required"
        )
      }
      const signatureBytes = this.decodeHex("signature", fill.signature, 96)

      txb.moveCall({
        target: `${path.publishedAt}::orderbook::swap`,
        typeArguments: [baseCoinType, quoteCoinType],
        arguments: [
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
        ],
      })
      return
    }

    if (orderbookVersion === 2) {
      const signatures = fill.signatures
      if (!signatures || signatures.length === 0) {
        throw new Error(
          "Cetus Tide V2: cetus_tide_fill.signatures must be a non-empty canonical bundle"
        )
      }
      const signatureBundle = signatures.map((signature, index) =>
        this.decodeHex(`signatures[${index}]`, signature, 96)
      )

      txb.moveCall({
        target: `${path.publishedAt}::orderbook_v2::swap`,
        typeArguments: [baseCoinType, quoteCoinType],
        arguments: [
          swapContext,
          txb.object(versioned),
          txb.object(globalConfig),
          txb.object(mmObjectId),
          txb.object(path.id),
          txb.pure.vector("u8", envelopeBytes),
          txb.pure.vector("vector<u8>", signatureBundle),
          txb.pure.u64(amountIn.toString()),
          txb.pure.bool(path.direction),
          txb.pure.vector("u8", quoteHashBytes),
          txb.object(SUI_CLOCK_OBJECT_ID),
        ],
      })
      return
    }
  }

  private resolveOrderbookVersion(
    ed: ExtendedDetails,
    fill: CetusTideFill
  ): 1 | 2 {
    const returnedVersion = ed.cetus_tide_orderbook_version

    // Legacy V1 responses did not include an explicit version. A V2 response
    // can still be recognized safely by its canonical multi-signature bundle.
    if (returnedVersion == null) {
      return fill.signatures && fill.signatures.length > 0 ? 2 : 1
    }

    const version = Number(returnedVersion)
    if (version === 1 || version === 2) {
      return version
    }

    throw new Error(
      `Cetus Tide: unsupported orderbook version ${String(returnedVersion)}`
    )
  }

  private decodeHex(label: string, value: string, expectedLength?: number) {
    let bytes: number[]
    try {
      bytes = Array.from(fromHex(value))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Cetus Tide: invalid ${label} hex: ${reason}`)
    }
    if (expectedLength != null && bytes.length !== expectedLength) {
      throw new Error(
        `Cetus Tide: ${label} must be ${expectedLength} bytes, got ${bytes.length}`
      )
    }
    return bytes
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
