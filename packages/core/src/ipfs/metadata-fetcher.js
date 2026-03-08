export class MetadataFetcher {
    gateway;
    timeout;
    constructor(config = {}) {
        this.gateway = config.gateway || 'https://gateway.pinata.cloud';
        this.timeout = config.timeout || 30000;
    }
    async fetchMetadata(ipfsHash) {
        try {
            const url = this.buildGatewayUrl(ipfsHash);
            const response = await this.fetchWithTimeout(url, this.timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const metadata = await response.json();
            this.validateMetadata(metadata);
            return metadata;
        }
        catch (error) {
            throw new Error(`Failed to fetch metadata from IPFS: ${error.message}`);
        }
    }
    async fetchBanList(url) {
        try {
            const fetchUrl = url.startsWith('ipfs://')
                ? this.buildGatewayUrl(url.replace('ipfs://', ''))
                : url;
            const response = await this.fetchWithTimeout(fetchUrl, this.timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const banList = await response.json();
            if (!banList || !banList.version || !Array.isArray(banList.bans)) {
                throw new Error('Invalid ban list format');
            }
            return banList;
        }
        catch (error) {
            console.warn(`Failed to fetch ban list: ${error.message}`);
            return {
                version: '1.0',
                bans: [],
            };
        }
    }
    async fetchAdminList(url) {
        try {
            const fetchUrl = url.startsWith('ipfs://')
                ? this.buildGatewayUrl(url.replace('ipfs://', ''))
                : url;
            const response = await this.fetchWithTimeout(fetchUrl, this.timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const adminList = await response.json();
            if (!adminList || !adminList.version || !Array.isArray(adminList.admins)) {
                throw new Error('Invalid admin list format');
            }
            return adminList;
        }
        catch (error) {
            console.warn(`Failed to fetch admin list: ${error.message}`);
            return {
                version: '1.0',
                admins: [],
            };
        }
    }
    async fetchImage(ipfsUrl) {
        try {
            const url = this.buildGatewayUrl(ipfsUrl.replace('ipfs://', ''));
            const response = await this.fetchWithTimeout(url, this.timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/png';
            return `data:${mimeType};base64,${base64}`;
        }
        catch (error) {
            throw new Error(`Failed to fetch image: ${error.message}`);
        }
    }
    async fetchRaw(ipfsHash) {
        try {
            const url = this.buildGatewayUrl(ipfsHash);
            const response = await this.fetchWithTimeout(url, this.timeout);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        }
        catch (error) {
            throw new Error(`Failed to fetch from IPFS: ${error.message}`);
        }
    }
    async fetchWithFallback(ipfsHash) {
        const gateways = [
            'https://gateway.pinata.cloud',
            'https://ipfs.io',
            'https://cloudflare-ipfs.com',
            'https://dweb.link',
        ];
        let lastError = null;
        for (const gateway of gateways) {
            try {
                const originalGateway = this.gateway;
                this.gateway = gateway;
                const metadata = await this.fetchMetadata(ipfsHash);
                this.gateway = originalGateway;
                return metadata;
            }
            catch (error) {
                lastError = error;
                console.warn(`Gateway ${gateway} failed, trying next...`);
            }
        }
        throw new Error(`All gateways failed. Last error: ${lastError?.message}`);
    }
    buildGatewayUrl(ipfsHash) {
        const hash = ipfsHash.replace('ipfs://', '');
        return `${this.gateway}/ipfs/${hash}`;
    }
    async fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    validateMetadata(metadata) {
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
    setGateway(gateway) {
        this.gateway = gateway;
    }
    getGateway() {
        return this.gateway;
    }
}
export function resolveIpfsUrl(ipfsUrl, gateway = 'https://gateway.pinata.cloud') {
    const hash = ipfsUrl.replace('ipfs://', '');
    return `${gateway}/ipfs/${hash}`;
}
export function extractIpfsHash(url) {
    if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', '');
    }
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (match) {
        return match[1];
    }
    return url;
}
//# sourceMappingURL=metadata-fetcher.js.map