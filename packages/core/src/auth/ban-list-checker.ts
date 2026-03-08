/**
 * Ban List Checker
 * Verify users against ban list from IPFS metadata
 */

import type { Address } from 'viem';
import { MetadataFetcher } from '../ipfs/metadata-fetcher';
import type { BanList, BanEntry } from '../types';

export interface BanCheckResult {
  address: Address;
  banned: boolean;
  reason?: string;
  bannedAt?: number;
  bannedBy?: Address;
}

export class BanListChecker {
  private metadataFetcher: MetadataFetcher;
  private banList: BanList | null = null;
  private lastFetch: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(metadataFetcher?: MetadataFetcher) {
    this.metadataFetcher = metadataFetcher || new MetadataFetcher();
  }

  /**
   * Load ban list from IPFS
   */
  async loadBanList(banListUrl: string): Promise<BanList> {
    console.log(`📥 Loading ban list from: ${banListUrl}`);

    this.banList = await this.metadataFetcher.fetchBanList(banListUrl);
    this.lastFetch = Date.now();

    console.log(`✅ Loaded ban list (${this.banList.bans.length} entries)`);

    return this.banList;
  }

  /**
   * Refresh ban list if cache is expired
   */
  async refreshIfNeeded(banListUrl: string): Promise<void> {
    const now = Date.now();

    if (!this.banList || now - this.lastFetch > this.cacheTimeout) {
      await this.loadBanList(banListUrl);
    }
  }

  /**
   * Check if address is banned
   */
  checkAddress(address: Address): BanCheckResult {
    if (!this.banList) {
      return {
        address,
        banned: false,
      };
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase() as Address;

    // Find ban entry
    const banEntry = this.banList.bans.find(
      (ban: BanEntry) => ban.address.toLowerCase() === normalizedAddress
    );

    if (!banEntry) {
      return {
        address: normalizedAddress,
        banned: false,
      };
    }

    return {
      address: normalizedAddress,
      banned: true,
      reason: banEntry.reason,
      bannedAt: banEntry.bannedAt,
      bannedBy: banEntry.bannedBy as Address,
    };
  }

  /**
   * Check if address is banned (async, with auto-refresh)
   */
  async checkAddressAsync(
    address: Address,
    banListUrl: string
  ): Promise<BanCheckResult> {
    await this.refreshIfNeeded(banListUrl);
    return this.checkAddress(address);
  }

  /**
   * Check multiple addresses
   */
  checkAddresses(addresses: Address[]): Map<Address, BanCheckResult> {
    const results = new Map<Address, BanCheckResult>();

    for (const address of addresses) {
      results.set(address, this.checkAddress(address));
    }

    return results;
  }

  /**
   * Get all banned addresses
   */
  getBannedAddresses(): Address[] {
    if (!this.banList) {
      return [];
    }

    return this.banList.bans.map((ban: BanEntry) => ban.address.toLowerCase() as Address);
  }

  /**
   * Get ban entry for address
   */
  getBanEntry(address: Address): BanEntry | undefined {
    if (!this.banList) {
      return undefined;
    }

    const normalizedAddress = address.toLowerCase();

    return this.banList.bans.find(
      (ban: BanEntry) => ban.address.toLowerCase() === normalizedAddress
    );
  }

  /**
   * Get ban count
   */
  getBanCount(): number {
    return this.banList?.bans.length ?? 0;
  }

  /**
   * Clear cached ban list
   */
  clearCache(): void {
    this.banList = null;
    this.lastFetch = 0;
  }

  /**
   * Get status
   */
  getStatus(): {
    loaded: boolean;
    banCount: number;
    version: string | null;
    lastFetch: number;
    cacheExpired: boolean;
  } {
    const now = Date.now();

    return {
      loaded: this.banList !== null,
      banCount: this.getBanCount(),
      version: this.banList?.version ?? null,
      lastFetch: this.lastFetch,
      cacheExpired: !this.banList || now - this.lastFetch > this.cacheTimeout,
    };
  }
}

/**
 * Helper to check if user should be rejected
 */
export function shouldRejectUser(result: BanCheckResult): boolean {
  return result.banned;
}

/**
 * Helper to format ban reason
 */
export function formatBanReason(result: BanCheckResult): string {
  if (!result.banned) {
    return 'Not banned';
  }

  const parts: string[] = [];

  if (result.reason) {
    parts.push(`Reason: ${result.reason}`);
  }

  if (result.bannedAt) {
    parts.push(`Banned: ${new Date(result.bannedAt).toLocaleString()}`);
  }

  if (result.bannedBy) {
    parts.push(`By: ${result.bannedBy}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Banned';
}
