import { MetadataFetcher } from '../ipfs/metadata-fetcher';
export class BanListChecker {
    metadataFetcher;
    banList = null;
    lastFetch = 0;
    cacheTimeout = 5 * 60 * 1000;
    constructor(metadataFetcher) {
        this.metadataFetcher = metadataFetcher || new MetadataFetcher();
    }
    async loadBanList(banListUrl) {
        console.log(`📥 Loading ban list from: ${banListUrl}`);
        this.banList = await this.metadataFetcher.fetchBanList(banListUrl);
        this.lastFetch = Date.now();
        console.log(`✅ Loaded ban list (${this.banList.bans.length} entries)`);
        return this.banList;
    }
    async refreshIfNeeded(banListUrl) {
        const now = Date.now();
        if (!this.banList || now - this.lastFetch > this.cacheTimeout) {
            await this.loadBanList(banListUrl);
        }
    }
    checkAddress(address) {
        if (!this.banList) {
            return {
                address,
                banned: false,
            };
        }
        const normalizedAddress = address.toLowerCase();
        const banEntry = this.banList.bans.find((ban) => ban.address.toLowerCase() === normalizedAddress);
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
            bannedBy: banEntry.bannedBy,
        };
    }
    async checkAddressAsync(address, banListUrl) {
        await this.refreshIfNeeded(banListUrl);
        return this.checkAddress(address);
    }
    checkAddresses(addresses) {
        const results = new Map();
        for (const address of addresses) {
            results.set(address, this.checkAddress(address));
        }
        return results;
    }
    getBannedAddresses() {
        if (!this.banList) {
            return [];
        }
        return this.banList.bans.map((ban) => ban.address.toLowerCase());
    }
    getBanEntry(address) {
        if (!this.banList) {
            return undefined;
        }
        const normalizedAddress = address.toLowerCase();
        return this.banList.bans.find((ban) => ban.address.toLowerCase() === normalizedAddress);
    }
    getBanCount() {
        return this.banList?.bans.length ?? 0;
    }
    clearCache() {
        this.banList = null;
        this.lastFetch = 0;
    }
    getStatus() {
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
export function shouldRejectUser(result) {
    return result.banned;
}
export function formatBanReason(result) {
    if (!result.banned) {
        return 'Not banned';
    }
    const parts = [];
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
//# sourceMappingURL=ban-list-checker.js.map