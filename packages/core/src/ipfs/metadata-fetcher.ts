/**
 * IPFS Metadata Fetcher
 * Handles fetching Accord metadata from IPFS
 */

import { AccordMetadata, BanList, AdminList } from '../types';

export interface FetcherConfig {
  gateway?: string;
  timeout?: number;
}

export class MetadataFetcher {
  private gateway: string;
  private timeout: number;

  constructor(config: FetcherConfig = {}) {
    // Use multiple gateways for redundancy
    this.gateway = config.gateway || 'https://gateway.pinata.cloud';
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Fetch Accord metadata from IPFS
   */
  async fetchMetadata(ipfsHash: string): Promise<AccordMetadata> {
    try {
      const url = this.buildGatewayUrl(ipfsHash);
      const response = await this.fetchWithTimeout(url, this.timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();

      // Validate metadata structure
      this.validateMetadata(metadata);

      return metadata as AccordMetadata;
    } catch (error: any) {
      throw new Error(`Failed to fetch metadata from IPFS: ${error.message}`);
    }
  }

  /**
   * Fetch ban list from URL
   */
  async fetchBanList(url: string): Promise<BanList> {
    try {
      // Handle both IPFS URLs and regular HTTP URLs
      const fetchUrl = url.startsWith('ipfs://')
        ? this.buildGatewayUrl(url.replace('ipfs://', ''))
        : url;

      const response = await this.fetchWithTimeout(fetchUrl, this.timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const banList = await response.json() as any;

      // Validate structure
      if (!banList || !banList.version || !Array.isArray(banList.bans)) {
        throw new Error('Invalid ban list format');
      }

      return banList as BanList;
    } catch (error: any) {
      // Return empty list if fetch fails (graceful degradation)
      console.warn(`Failed to fetch ban list: ${error.message}`);
      return {
        version: '1.0',
        bans: [],
      };
    }
  }

  /**
   * Fetch admin list from URL
   */
  async fetchAdminList(url: string): Promise<AdminList> {
    try {
      const fetchUrl = url.startsWith('ipfs://')
        ? this.buildGatewayUrl(url.replace('ipfs://', ''))
        : url;

      const response = await this.fetchWithTimeout(fetchUrl, this.timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const adminList = await response.json() as any;

      // Validate structure
      if (!adminList || !adminList.version || !Array.isArray(adminList.admins)) {
        throw new Error('Invalid admin list format');
      }

      return adminList as AdminList;
    } catch (error: any) {
      // Return empty list if fetch fails
      console.warn(`Failed to fetch admin list: ${error.message}`);
      return {
        version: '1.0',
        admins: [],
      };
    }
  }

  /**
   * Fetch image from IPFS and return as data URL
   */
  async fetchImage(ipfsUrl: string): Promise<string> {
    try {
      const url = this.buildGatewayUrl(ipfsUrl.replace('ipfs://', ''));
      const response = await this.fetchWithTimeout(url, this.timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // For Node.js environments, just return the URL
      // In browser, you would convert to base64 data URL
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/png';
      return `data:${mimeType};base64,${base64}`;
    } catch (error: any) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }
  }

  /**
   * Fetch raw data from IPFS
   */
  async fetchRaw(ipfsHash: string): Promise<string> {
    try {
      const url = this.buildGatewayUrl(ipfsHash);
      const response = await this.fetchWithTimeout(url, this.timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      throw new Error(`Failed to fetch from IPFS: ${error.message}`);
    }
  }

  /**
   * Try multiple gateways for redundancy
   */
  async fetchWithFallback(ipfsHash: string): Promise<AccordMetadata> {
    const gateways = [
      'https://gateway.pinata.cloud',
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://dweb.link',
    ];

    let lastError: Error | null = null;

    for (const gateway of gateways) {
      try {
        const originalGateway = this.gateway;
        this.gateway = gateway;
        const metadata = await this.fetchMetadata(ipfsHash);
        this.gateway = originalGateway;
        return metadata;
      } catch (error: any) {
        lastError = error;
        console.warn(`Gateway ${gateway} failed, trying next...`);
      }
    }

    throw new Error(`All gateways failed. Last error: ${lastError?.message}`);
  }

  /**
   * Build gateway URL from IPFS hash
   */
  private buildGatewayUrl(ipfsHash: string): string {
    // Remove ipfs:// prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    return `${this.gateway}/ipfs/${hash}`;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(metadata: any): void {
    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Invalid metadata: missing or invalid name');
    }

    if (!metadata.version) {
      throw new Error('Invalid metadata: missing version');
    }

    if (!metadata.category) {
      throw new Error('Invalid metadata: missing category');
    }

    if (!Array.isArray(metadata.rules)) {
      throw new Error('Invalid metadata: rules must be an array');
    }
  }

  /**
   * Change gateway
   */
  setGateway(gateway: string): void {
    this.gateway = gateway;
  }

  /**
   * Get current gateway
   */
  getGateway(): string {
    return this.gateway;
  }
}

/**
 * Helper to resolve IPFS URL to HTTP gateway URL
 */
export function resolveIpfsUrl(ipfsUrl: string, gateway = 'https://gateway.pinata.cloud'): string {
  const hash = ipfsUrl.replace('ipfs://', '');
  return `${gateway}/ipfs/${hash}`;
}

/**
 * Helper to extract IPFS hash from URL
 */
export function extractIpfsHash(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '');
  }

  // Extract from gateway URL
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (match) {
    return match[1];
  }

  return url;
}
