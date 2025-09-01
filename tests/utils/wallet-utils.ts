import fs from "fs"
import path from "path"

interface CoinHolder {
  account: string
  balance: string
  percentage: string
  name?: string
  image?: string
  website?: string
}

interface BlockVisionResponse {
  code: number
  message: string
  result: {
    data: CoinHolder[]
    nextPageIndex: number
    total: number
  }
}

/**
 * Wallet utility class for managing optimal wallets in tests
 */
export class WalletUtils {
  private static coinHolderCache: Map<string, string> = new Map()
  private static testDataPath: string = path.join(
    __dirname,
    "..",
    "benchmarks",
    "test_data",
    "coin_holders.json"
  )
  private static initialized: boolean = false

  /**
   * Initialize the wallet utility by loading cached coin holders
   */
  static init() {
    if (this.initialized) return

    try {
      if (fs.existsSync(this.testDataPath)) {
        const data = JSON.parse(fs.readFileSync(this.testDataPath, "utf8"))
        this.coinHolderCache = new Map(Object.entries(data))
        console.log(
          `📁 Loaded ${this.coinHolderCache.size} cached coin holders from ${this.testDataPath}`
        )
      } else {
        console.log(
          `📁 No cached coin holders found, will create ${this.testDataPath}`
        )
      }
    } catch (error) {
      console.log(`⚠️  Error loading coin holder cache: ${error}`)
    }

    this.initialized = true
  }

  /**
   * Get the optimal wallet address for testing - uses largest coin holder from cache if available
   */
  static async getOptimalWalletForTesting(
    coinType: string,
    fallbackWallet: string
  ): Promise<string> {
    this.init()

    const holderAddress = await this.getLargestCoinHolder(coinType)
    return holderAddress || fallbackWallet
  }

  /**
   * Fetch the largest coin holder address for a specific coin type
   */
  private static async getLargestCoinHolder(
    coinType: string
  ): Promise<string | null> {
    // Check cache first
    if (this.coinHolderCache.has(coinType)) {
      const cachedAddress = this.coinHolderCache.get(coinType)!
      console.log(
        `📋 Using cached largest holder for ${this.getShortAddress(
          coinType
        )}: ${this.getShortAddress(cachedAddress)}`
      )
      return cachedAddress
    }

    try {
      console.log(
        `🔍 Fetching largest holder for ${this.getShortAddress(coinType)}...`
      )

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      // Add API key if available
      const apiKey = process.env.BLOCKVISION_API_KEY
      if (apiKey) {
        headers["x-api-key"] = apiKey
      }

      const url = `https://api.blockvision.org/v2/sui/coin/holders?coinType=${encodeURIComponent(
        coinType
      )}&pageSize=10`
      console.log(`   🌐 Request URL: ${url}`)

      const response = await fetch(url, { headers })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 403) {
          console.log(
            `   ⚠️  BlockVision API authentication failed (${response.status}): ${errorText}`
          )
          console.log(
            `   💡 Check your API key at https://docs.blockvision.org/`
          )
        } else {
          console.log(
            `   ⚠️  BlockVision API failed (${response.status}): ${errorText}`
          )
        }
        return null
      }

      const data: BlockVisionResponse = await response.json()

      if (data.result && data.result.data && data.result.data.length > 0) {
        // Find the holder with the largest balance
        const largestHolder = data.result.data.reduce((max, holder) =>
          parseFloat(holder.balance) > parseFloat(max.balance) ? holder : max
        )

        const holderName = largestHolder.name ? ` (${largestHolder.name})` : ""
        console.log(
          `   ✅ Found largest holder: ${this.getShortAddress(
            largestHolder.account
          )}${holderName} (${largestHolder.balance} coins)`
        )

        // Cache the result in memory and file
        this.coinHolderCache.set(coinType, largestHolder.account)
        this.saveCoinHolderCache()
        return largestHolder.account
      }
    } catch (error) {
      console.log(`   ⚠️  Error fetching coin holders: ${error}`)
    }

    return null
  }

  /**
   * Save coin holder cache to file
   */
  private static saveCoinHolderCache() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.testDataPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const data = Object.fromEntries(this.coinHolderCache)
      fs.writeFileSync(this.testDataPath, JSON.stringify(data, null, 2))
      console.log(`💾 Saved coin holder cache to ${this.testDataPath}`)
    } catch (error) {
      console.log(`⚠️  Error saving coin holder cache: ${error}`)
    }
  }

  /**
   * Get short address for display
   */
  private static getShortAddress(address: string): string {
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * Create a wallet-aware test function that uses optimal wallet
   */
  static async withOptimalWallet<T>(
    coinType: string,
    fallbackWallet: string,
    testFn: (wallet: string) => Promise<T>
  ): Promise<T> {
    const optimalWallet = await this.getOptimalWalletForTesting(
      coinType,
      fallbackWallet
    )
    return testFn(optimalWallet)
  }
}
