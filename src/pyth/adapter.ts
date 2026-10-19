import { HermesClient } from "@pythnetwork/hermes-client"
import { SuiGrpcClient } from "@mysten/sui/grpc"
import { bcs } from "@mysten/sui/bcs"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { Transaction } from "@mysten/sui/transactions"

const MAX_ARGUMENT_SIZE = 16 * 1024
const DEFAULT_HERMES_URL = "https://hermes.pyth.network"
const DEFAULT_AVAILABILITY_TIMEOUT = 3000
const DEFAULT_IS_AVAILABLE_STATUS = (status: number) =>
  status >= 200 && status < 400

export type ObjectId = string

interface PriceTableInfo {
  id: ObjectId
  fieldType: string
}

export interface PythAvailabilitySnapshot {
  checked: boolean
  availableUrls: string[]
  unavailableUrls: string[]
}

export interface PythAvailabilityOptions {
  timeout?: number
  isAvailableStatus?: (status: number) => boolean
}

export class PythAdapter {
  private client: SuiGrpcClient
  private hermesClients: HermesClient[]
  private hermesUrls: string[]
  private pythStateId: ObjectId
  private wormholeStateId: ObjectId
  private pythPackageId: string | undefined
  private wormholePackageId: string | undefined
  private priceTableInfo: PriceTableInfo | undefined
  private priceFeedObjectIdCache = new Map<string, string>()
  private baseUpdateFee: number | undefined

  constructor(
    client: SuiGrpcClient,
    pythStateId: ObjectId,
    wormholeStateId: ObjectId,
    hermesUrls: string[],
  ) {
    this.client = client
    this.pythStateId = pythStateId
    this.wormholeStateId = wormholeStateId

    const urls = Array.from(
      new Set(hermesUrls.filter(Boolean).map(normalizeServiceUrl))
    )
    if (!urls.includes(DEFAULT_HERMES_URL)) {
      urls.push(DEFAULT_HERMES_URL)
    }
    this.hermesUrls = urls
    this.hermesClients = urls.map(
      url => new HermesClient(url, { timeout: 3000 })
    )
  }

  getHermesUrls(): string[] {
    return [...this.hermesUrls]
  }

  async checkHermesAvailability(
    {
      timeout = DEFAULT_AVAILABILITY_TIMEOUT,
      isAvailableStatus = DEFAULT_IS_AVAILABLE_STATUS,
    }: PythAvailabilityOptions = {}
  ): Promise<PythAvailabilitySnapshot> {
    if (this.hermesUrls.length === 0) {
      return {
        checked: false,
        availableUrls: [],
        unavailableUrls: [],
      }
    }

    const results = await Promise.all(
      this.hermesUrls.map(async url => ({
        url,
        available: await checkServiceUrl(url, timeout, isAvailableStatus),
      }))
    )

    return {
      checked: true,
      availableUrls: results
        .filter(result => result.available)
        .map(result => result.url),
      unavailableUrls: results
        .filter(result => !result.available)
        .map(result => result.url),
    }
  }

  async isHermesAvailable(options?: PythAvailabilityOptions): Promise<boolean> {
    const snapshot = await this.checkHermesAvailability(options)
    return snapshot.availableUrls.length > 0
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

    const { object } = await this.client.getObject({
      objectId: this.pythStateId,
      include: { json: true },
    })
    const json = object.json as Record<string, any> | null
    if (!json) {
      throw new Error("Unable to fetch pyth state object")
    }
    this.baseUpdateFee = Number(json.base_update_fee)
    return this.baseUpdateFee
  }

  async getPackageId(objectId: ObjectId): Promise<string> {
    const { object } = await this.client.getObject({
      objectId,
      include: { json: true },
    })
    const json = object.json as Record<string, any> | null
    if (!json) {
      throw new Error(`Cannot fetch package id for object ${objectId}`)
    }
    if ("upgrade_cap" in json) {
      return json.upgrade_cap.package
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

    // Direct lookup using getDynamicField with BCS-encoded PriceIdentifier key
    try {
      const PriceIdentifier = bcs.struct('PriceIdentifier', {
        bytes: bcs.vector(bcs.u8()),
      })
      const bcsBytes = PriceIdentifier.serialize({ bytes: Array.from(feedIdBytes) }).toBytes()

      const result = await this.client.getDynamicField({
        parentId: tableId,
        name: {
          type: fieldType,
          bcs: bcsBytes,
        },
      })

      // Decode the object::ID value from BCS
      const valueBcs = result.dynamicField.value.bcs
      const valueBytes = valueBcs instanceof Uint8Array ? valueBcs : new Uint8Array(Object.values(valueBcs))
      const objectId = "0x" + Array.from(valueBytes).map(b => b.toString(16).padStart(2, '0')).join('')

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

    // Look up the price_info dynamic field from the pyth state object
    let cursor: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
      const dynamicFields: Awaited<ReturnType<SuiGrpcClient['listDynamicFields']>> =
        await this.client.listDynamicFields({
          parentId: this.pythStateId,
          cursor,
        })

      for (const field of dynamicFields.dynamicFields) {
        if (field.name.type === "vector<u8>") {
          // For dynamic object fields, resolve the child object directly
          const objectId = (field.$kind === "DynamicObject" && field.childId)
            ? field.childId
            : field.fieldId
          const fieldObj = await this.client.getObject({
            objectId,
            include: { json: true },
          })
          const type = fieldObj.object.type
          if (type.includes("table::Table")) {
            // Extract the key type (PriceIdentifier) from Table<KeyType, ValueType>
            const innerTypes = type.replace(/.*table::Table</, "").replace(/>$/, "")
            const fieldType = innerTypes.split(",")[0].trim()
            this.priceTableInfo = { id: fieldObj.object.objectId, fieldType }
            return this.priceTableInfo
          }
        }
      }

      hasNextPage = dynamicFields.hasNextPage
      cursor = dynamicFields.cursor
    }

    throw new Error(
      "Price Table not found, contract may not be initialized"
    )
  }

  extractVaaBytesFromAccumulatorMessage(
    accumulatorMessage: Buffer
  ): Buffer {
    const trailingPayloadSize = accumulatorMessage.readUInt8(6)
    const vaaSizeOffset =
      7 + trailingPayloadSize + 1 // header(7) + trailing payload + proof_type(1)
    const vaaSize = accumulatorMessage.readUInt16BE(vaaSizeOffset)
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

async function checkServiceUrl(
  url: string,
  timeout: number,
  isAvailableStatus: (status: number) => boolean
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
    return isAvailableStatus(response.status)
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function normalizeServiceUrl(url: string) {
  return url.replace(/\/+$/, "")
}
