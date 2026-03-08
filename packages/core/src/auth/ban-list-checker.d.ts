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
export declare class BanListChecker {
    private metadataFetcher;
    private banList;
    private lastFetch;
    private cacheTimeout;
    constructor(metadataFetcher?: MetadataFetcher);
    loadBanList(banListUrl: string): Promise<BanList>;
    refreshIfNeeded(banListUrl: string): Promise<void>;
    checkAddress(address: Address): BanCheckResult;
    checkAddressAsync(address: Address, banListUrl: string): Promise<BanCheckResult>;
    checkAddresses(addresses: Address[]): Map<Address, BanCheckResult>;
    getBannedAddresses(): Address[];
    getBanEntry(address: Address): BanEntry | undefined;
    getBanCount(): number;
    clearCache(): void;
    getStatus(): {
        loaded: boolean;
        banCount: number;
        version: string | null;
        lastFetch: number;
        cacheExpired: boolean;
    };
}
export declare function shouldRejectUser(result: BanCheckResult): boolean;
export declare function formatBanReason(result: BanCheckResult): string;
//# sourceMappingURL=ban-list-checker.d.ts.map