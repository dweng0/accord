import { AccordMetadata, BanList, AdminList } from '../types';
export interface FetcherConfig {
    gateway?: string;
    timeout?: number;
}
export declare class MetadataFetcher {
    private gateway;
    private timeout;
    constructor(config?: FetcherConfig);
    fetchMetadata(ipfsHash: string): Promise<AccordMetadata>;
    fetchBanList(url: string): Promise<BanList>;
    fetchAdminList(url: string): Promise<AdminList>;
    fetchImage(ipfsUrl: string): Promise<string>;
    fetchRaw(ipfsHash: string): Promise<string>;
    fetchWithFallback(ipfsHash: string): Promise<AccordMetadata>;
    private buildGatewayUrl;
    private fetchWithTimeout;
    private validateMetadata;
    setGateway(gateway: string): void;
    getGateway(): string;
}
export declare function resolveIpfsUrl(ipfsUrl: string, gateway?: string): string;
export declare function extractIpfsHash(url: string): string;
//# sourceMappingURL=metadata-fetcher.d.ts.map