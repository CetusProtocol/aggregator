import { HermesClient } from "@pythnetwork/hermes-client"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import { bcs } from "@mysten/sui/bcs"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { Transaction } from "@mysten/sui/transactions"

const MAX_ARGUMENT_SIZE = 16 * 1024

export type ObjectId = string

interface PriceTableInfo {
  id: ObjectId
  fieldType: string
}

export class PythAdapter {
  private client: SuiJsonRpcClient
  private hermesClients: HermesClient[]
  private pythStateId: ObjectId
  private wormholeStateId: ObjectId
  private pythPackageId: string | undefined
  private wormholePackageId: string | undefined
  private priceTableInfo: PriceTableInfo | undefined
  private priceFeedObjectIdCache = new Map<string, string>()
  private baseUpdateFee: number | undefined

  constructor(
    client: SuiJsonRpcClient,
    pythStateId: ObjectId,
    wormholeStateId: ObjectId,
    hermesUrls: string[],
  ) {
    this.client = client
    this.pythStateId = pythStateId
    this.wormholeStateId = wormholeStateId

    const urls = [...hermesUrls]
    if (!urls.includes("https://hermes.pyth.network")) {
      urls.push("https://hermes.pyth.network")
    }
    this.hermesClients = urls.map(
      url => new HermesClient(url, { timeout: 3000 })
    )
  }

  async getPriceFeedsUpdateData(priceIDs: string[]): Promise<Buffer[]> {
    let lastError: Error | null = null

    for (const hermes of this.hermesClients) {
      try {
        const response = await hermes.getLatestPriceUpdates(priceIDs, {
          encoding: "hex",
        })
        return response.binary.data.map(hex => Buffer.from(hex, "hex"))
      } catch (e) {
        lastError = e as Error
        continue
      }
    }

    throw new Error(
      `All Pyth Hermes endpoints are unavailable. Detailed error: ${lastError?.message}`
    )
  }

  async getBaseUpdateFee(): Promise<number> {
    if (this.baseUpdateFee !== undefined) {
      return this.baseUpdateFee
    }

    const res = await this.client.getObject({
      id: this.pythStateId,
      options: { showContent: true },
    })
    const content = res.data?.content
    const json = (content && 'fields' in content ? content.fields : null) as Record<string, any> | null
    if (!json) {
      throw new Error("Unable to fetch pyth state object")
    }
    this.baseUpdateFee = Number(json.base_update_fee)
    return this.baseUpdateFee
  }

  async getPackageId(objectId: ObjectId): Promise<string> {
    const res = await this.client.getObject({
      id: objectId,
      options: { showContent: true },
    })
    const content = res.data?.content
    const json = (content && 'fields' in content ? content.fields : null) as Record<string, any> | null
    if (!json) {
      throw new Error(`Cannot fetch package id for object ${objectId}`)
    }
    if ("upgrade_cap" in json) {
      const upgradeCap = json.upgrade_cap as Record<string, any> | null
      const packageId = upgradeCap?.fields?.package
      if (typeof packageId === "string") {
        return packageId
      }
    }
    throw new Error("upgrade_cap not found")
  }

  async getWormholePackageId(): Promise<string> {
    if (!this.wormholePackageId) {
      this.wormholePackageId = await this.getPackageId(this.wormholeStateId)
    }
    return this.wormholePackageId
  }

  async getPythPackageId(): Promise<string> {
    if (!this.pythPackageId) {
      this.pythPackageId = await this.getPackageId(this.pythStateId)
    }
    return this.pythPackageId
  }

  async getPriceFeedObjectId(feedId: string): Promise<string | undefined> {
    const normalizedFeedId = feedId.replace("0x", "")
    if (this.priceFeedObjectIdCache.has(normalizedFeedId)) {
      return this.priceFeedObjectIdCache.get(normalizedFeedId)
    }

    const { id: tableId, fieldType } = await this.getPriceTableInfo()
    const feedIdBytes = Buffer.from(normalizedFeedId, "hex")

    // Direct lookup using getDynamicFieldObject with JSON value for PriceIdentifier key
    try {
      const result = await this.client.getDynamicFieldObject({
        parentId: tableId,
        name: {
          type: `${fieldType}::price_identifier::PriceIdentifier`,
          value: { bytes: Array.from(feedIdBytes) },
        },
      })

      const content = result.data?.content
      const json = (content && "fields" in content ? content.fields : null) as Record<string, any> | null
      const objectId = typeof json?.value === "string" ? json.value : undefined
      if (!objectId) {
        return undefined
      }

      this.priceFeedObjectIdCache.set(normalizedFeedId, objectId)
      return objectId
    } catch {
      return undefined
    }
  }

  async getPriceTableInfo(): Promise<PriceTableInfo> {
    if (this.priceTableInfo !== undefined) {
      return this.priceTableInfo
    }

    const result = await this.client.getDynamicFieldObject({
      parentId: this.pythStateId,
      name: {
        type: "vector<u8>",
        value: "price_info",
      },
    })

    if (!result.data?.type) {
      throw new Error(
        "Price Table not found, contract may not be initialized"
      )
    }

    let type = result.data.type.replace("0x2::table::Table<", "")
    type = type.replace("::price_identifier::PriceIdentifier, 0x2::object::ID>", "")
    this.priceTableInfo = { id: result.data.objectId, fieldType: type }
    return this.priceTableInfo
  }

  extractVaaBytesFromAccumulatorMessage(
    accumulatorMessage: Buffer
  ): Buffer {
    const trailingPayloadSize = accumulatorMessage.readUint8(6)
    const vaaSizeOffset =
      7 + trailingPayloadSize + 1 // header(7) + trailing payload + proof_type(1)
    const vaaSize = accumulatorMessage.readUint16BE(vaaSizeOffset)
    const vaaOffset = vaaSizeOffset + 2
    return accumulatorMessage.subarray(vaaOffset, vaaOffset + vaaSize)
  }

  private async verifyVaas(vaas: Buffer[], tx: Transaction) {
    const wormholePackageId = await this.getWormholePackageId()
    const verifiedVaas = []

    for (const vaa of vaas) {
      const [verifiedVaa] = tx.moveCall({
        target: `${wormholePackageId}::vaa::parse_and_verify`,
        arguments: [
          tx.object(this.wormholeStateId),
          tx.pure(
            bcs
              .vector(bcs.u8())
              .serialize(Array.from(vaa), { maxSize: MAX_ARGUMENT_SIZE })
              .toBytes()
          ),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      })
      verifiedVaas.push(verifiedVaa)
    }

    return verifiedVaas
  }

  private async verifyVaasAndGetHotPotato(
    tx: Transaction,
    updates: Buffer[],
    packageId: string
  ) {
    if (updates.length > 1) {
      throw new Error(
        "SDK does not support sending multiple accumulator messages in a single transaction"
      )
    }

    const vaa = this.extractVaaBytesFromAccumulatorMessage(updates[0])
    const verifiedVaas = await this.verifyVaas([vaa], tx)

    const [priceUpdatesHotPotato] = tx.moveCall({
      target: `${packageId}::pyth::create_authenticated_price_infos_using_accumulator`,
      arguments: [
        tx.object(this.pythStateId),
        tx.pure(
          bcs
            .vector(bcs.u8())
            .serialize(Array.from(updates[0]), { maxSize: MAX_ARGUMENT_SIZE })
            .toBytes()
        ),
        verifiedVaas[0],
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    })

    return priceUpdatesHotPotato
  }

  async updatePriceFeeds(
    tx: Transaction,
    updates: Buffer[],
    feedIds: string[]
  ): Promise<ObjectId[]> {
    const packageId = await this.getPythPackageId()
    let priceUpdatesHotPotato = await this.verifyVaasAndGetHotPotato(
      tx,
      updates,
      packageId
    )

    const baseUpdateFee = await this.getBaseUpdateFee()
    const coins = tx.splitCoins(
      tx.gas,
      feedIds.map(() => tx.pure.u64(baseUpdateFee))
    )

    const priceInfoObjects: string[] = []
    let coinId = 0

    for (const feedId of feedIds) {
      const priceInfoObjectId = await this.getPriceFeedObjectId(feedId)
      if (!priceInfoObjectId) {
        throw new Error(
          `Price feed ${feedId} not found, please create it first`
        )
      }
      priceInfoObjects.push(priceInfoObjectId)

      ;[priceUpdatesHotPotato] = tx.moveCall({
        target: `${packageId}::pyth::update_single_price_feed`,
        arguments: [
          tx.object(this.pythStateId),
          priceUpdatesHotPotato,
          tx.object(priceInfoObjectId),
          coins[coinId],
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      })
      coinId++
    }

    tx.moveCall({
      target: `${packageId}::hot_potato_vector::destroy`,
      arguments: [priceUpdatesHotPotato],
      typeArguments: [`${packageId}::price_info::PriceInfo`],
    })

    return priceInfoObjects
  }
}
