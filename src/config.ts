export type Package = {
  packageName: string
  packageId: string
  publishedAt: string
}

export enum Env {
  Mainnet,
  Testnet,
}

export class AggregatorConfig {
  private endpoint: string
  private fullNodeUrl: string
  private signer: string
  private env: Env

  constructor(endpoint: string, fullNodeUrl: string, signer: string, env: Env) {
    this.endpoint = endpoint
    this.fullNodeUrl = fullNodeUrl
    this.signer = signer
    this.env = env
  }

  getAggregatorUrl(): string {
    return this.endpoint
  }

  getFullNodeUrl(): string {
    return this.fullNodeUrl
  }

  getWallet(): string {
    return this.signer
  }

  getENV(): Env {
    return this.env
  }
}
