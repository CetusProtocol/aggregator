export type Package = {
  packageName: string
  packageId: string
  publishedAt: string
}

export enum ENV {
  MAINNET,
  TESTNET,
}

export class AggregatorConfig {
  private aggregatorUrl: string;
  private fullNodeUrl: string;
  private wallet: string;
  private packages: Package[];
  private env: ENV;

  constructor(aggregatorUrl: string, fullNodeUrl: string, wallet: string, packages: Package[], env: ENV) {
    this.aggregatorUrl = aggregatorUrl;
    this.fullNodeUrl = fullNodeUrl;
    this.wallet = wallet;
    this.packages = packages;
    this.env = env;
  }

  getAggregatorUrl(): string {
    return this.aggregatorUrl;
  }

  getFullNodeUrl(): string {
    return this.fullNodeUrl;
  }

  getWallet(): string {
    return this.wallet;
  }

  getENV(): ENV {
    return this.env
  }

  getPackages(): Package[] {
    return this.packages;
  }

  getPackage(packageName: string) {
    return this.packages.find(pkg => pkg.packageName === packageName);
  }

  addPackage(newPackage: Package): void {
    if (!newPackage.packageName || !newPackage.packageId || !newPackage.publishedAt) {
      throw new Error("Invalid package data");
    }
    this.packages.push(newPackage);
  }

  removePackageById(packageId: string): void {
    this.packages = this.packages.filter(pkg => pkg.packageId !== packageId);
  }

  findPackageById(packageId: string): Package | undefined {
    return this.packages.find(pkg => pkg.packageId === packageId);
  }
}
