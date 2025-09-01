import { Env } from "../config"

/**
 * Shared configuration for AggregatorClient
 * This module provides static configuration methods that can be accessed
 * without circular dependencies
 */
export class AggregatorConfig {
  private static publishedAtV2Map: Map<Env, string> = new Map([
    [Env.Mainnet, "0x8ae871505a80d8bf6bf9c05906cda6edfeea460c85bebe2e26a4313f5e67874a"], // version 12
    [Env.Testnet, "0x52eae33adeb44de55cfb3f281d4cc9e02d976181c0952f5323648b5717b33934"],
  ])

  private static publishedAtV2ExtendMap: Map<Env, string> = new Map([
    [Env.Mainnet, "0x8a2f7a5b20665eeccc79de3aa37c3b6c473eca233ada1e1cd4678ec07d4d4073"], // version 17
    [Env.Testnet, "0xabb6a81c8a216828e317719e06125de5bb2cb0fe8f9916ff8c023ca5be224c78"],
  ])

  private static publishedAtV2Extend2Map: Map<Env, string> = new Map([
    [Env.Mainnet, "0x5cb7499fc49c2642310e24a4ecffdbee00133f97e80e2b45bca90c64d55de880"], // version 8
    [Env.Testnet, "0x0"],
  ])

  private static currentEnv: Env = Env.Mainnet

  static setEnv(env: Env): void {
    this.currentEnv = env
  }

  static getEnv(): Env {
    return this.currentEnv
  }

  static getPublishedAtV2(env?: Env): string {
    const targetEnv = env ?? this.currentEnv
    return this.publishedAtV2Map.get(targetEnv) || ""
  }

  static getPublishedAtV2Extend(env?: Env): string {
    const targetEnv = env ?? this.currentEnv
    return this.publishedAtV2ExtendMap.get(targetEnv) || ""
  }

  static getPublishedAtV2Extend2(env?: Env): string {
    const targetEnv = env ?? this.currentEnv
    return this.publishedAtV2Extend2Map.get(targetEnv) || ""
  }
}