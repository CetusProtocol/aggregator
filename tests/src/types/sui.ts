import type { TransactionArgument } from '@mysten/sui/transactions'
import Decimal from 'decimal.js'
import { TypesErrorCode } from '../errors'

/**
 * Represents a SUI address, which is a string.
 */
export type SuiAddress = string

/**
 * Represents a SUI object identifier, which is a string.
 */
export type SuiObjectIdType = string

/**
 * Represents a BigNumber, which can be a Decimal.Value, number, or string.
 */
export type BigNumber = Decimal.Value | number | string


/**
 * Represents a SUI resource, which can be of any type.
 */
export type SuiResource = any

/**
 * Represents a Non-Fungible Token (NFT) with associated metadata.
 */
export type NFT = {
  /**
   * The address or identifier of the creator of the NFT.
   */
  creator: string

  /**
   * A description providing additional information about the NFT.
   */
  description: string

  /**
   * The URL to the image representing the NFT visually.
   */
  image_url: string

  /**
   * A link associated with the NFT, providing more details or interactions.
   */
  link: string

  /**
   * The name or title of the NFT.
   */
  name: string

  /**
   * The URL to the project or collection associated with the NFT.
   */
  project_url: string
}

/**
 * Represents a SUI struct tag.
 */
export type SuiStructTag = {
  /**
   * The full address of the struct.
   */
  full_address: string

  /**
   * The source address of the struct.
   */
  source_address: string

  /**
   * The address of the struct.
   */
  address: SuiAddress

  /**
   * The module to which the struct belongs.
   */
  module: string

  /**
   * The name of the struct.
   */
  name: string

  /**
   * An array of type arguments (SUI addresses) for the struct.
   */
  type_arguments: SuiAddress[]
}

/**
 * Represents basic SUI data types.
 */
export type SuiBasicTypes = 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256'

/**
 * Represents a SUI transaction argument, which can be of various types.
 */
export type SuiTxArg = TransactionArgument | string | number | bigint | boolean

/**
 * Represents input types for SUI data.
 */
export type SuiInputTypes = 'object' | SuiBasicTypes

/**
 * Gets the default SUI input type based on the provided value.
 * @param value - The value to determine the default input type for.
 * @returns The default SUI input type.
 * @throws Error if the type of the value is unknown.
 */
export const getDefaultSuiInputType = (value: any): SuiInputTypes => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return 'object'
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'u64'
  }
  if (typeof value === 'boolean') {
    return 'bool'
  }
  throw new AggregateError(`Unknown type for value: ${value}`, TypesErrorCode.InvalidType)
}

/**
 * Represents a coin asset with address, object ID, and balance information.
 */
export type CoinAsset = {
  /**
   * The address type of the coin asset.
   */
  coinAddress: SuiAddress

  /**
   * The object identifier of the coin asset.
   */
  coinObjectId: SuiObjectIdType

  /**
   * The balance amount of the coin asset.
   */
  balance: bigint
}
