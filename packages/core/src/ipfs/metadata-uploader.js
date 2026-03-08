import pinataSDK from '@pinata/sdk';
import fs from 'fs';
import path from 'path';
export class MetadataUploader {
    pinata;
    constructor(config) {
        this.pinata = new pinataSDK(config.apiKey, config.secretApiKey);
    }
    async testAuthentication() {
        try {
            const result = await this.pinata.testAuthentication();
            return result.authenticated === true;
        }
        catch (error) {
            console.error('Pinata authentication failed:', error);
            return false;
        }
    }
    async uploadMetadata(metadata) {
        try {
            this.validateMetadata(metadata);
            const result = await this.pinata.pinJSONToIPFS(metadata, {
                pinataMetadata: {
                    name: `accord-${metadata.name}`,
                    keyvalues: {
                        category: metadata.category,
                        version: metadata.version,
                    },
                },
            });
            console.log(`✅ Metadata uploaded to IPFS: ${result.IpfsHash}`);
            return result.IpfsHash;
        }
        catch (error) {
            throw new Error(`Failed to upload metadata: ${error.message}`);
        }
    }
    async uploadImage(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const readableStreamForFile = fs.createReadStream(filePath);
            const fileName = path.basename(filePath);
            const result = await this.pinata.pinFileToIPFS(readableStreamForFile, {
                pinataMetadata: {
                    name: fileName,
                },
            });
            const ipfsUrl = `ipfs://${result.IpfsHash}`;
            console.log(`✅ Image uploaded: ${ipfsUrl}`);
            return ipfsUrl;
        }
        catch (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }
    async uploadImages(iconPath, bannerPath) {
        const result = {};
        if (iconPath) {
            result.icon = await this.uploadImage(iconPath);
        }
        if (bannerPath) {
            result.banner = await this.uploadImage(bannerPath);
        }
        return result;
    }
    async uploadBanList(banList) {
        try {
            const result = await this.pinata.pinJSONToIPFS(banList, {
                pinataMetadata: {
                    name: 'banlist',
                },
            });
            return `ipfs://${result.IpfsHash}`;
        }
        catch (error) {
            throw new Error(`Failed to upload ban list: ${error.message}`);
        }
    }
    async uploadAdminList(adminList) {
        try {
            const result = await this.pinata.pinJSONToIPFS(adminList, {
                pinataMetadata: {
                    name: 'adminlist',
                },
            });
            return `ipfs://${result.IpfsHash}`;
        }
        catch (error) {
            throw new Error(`Failed to upload admin list: ${error.message}`);
        }
    }
    async unpin(ipfsHash) {
        try {
            await this.pinata.unpin(ipfsHash);
            console.log(`🗑️  Unpinned: ${ipfsHash}`);
        }
        catch (error) {
            throw new Error(`Failed to unpin: ${error.message}`);
        }
    }
    async listPinned() {
        try {
            const result = await this.pinata.pinList({ status: 'pinned' });
            return result.rows;
        }
        catch (error) {
            throw new Error(`Failed to list pinned files: ${error.message}`);
        }
    }
    validateMetadata(metadata) {
        if (!metadata.name || metadata.name.trim().length === 0) {
            throw new Error('Metadata must have a name');
        }
        if (!metadata.version) {
            throw new Error('Metadata must have a version');
        }
        if (!metadata.category) {
            throw new Error('Metadata must have a category');
        }
        if (!Array.isArray(metadata.rules)) {
            throw new Error('Rules must be an array');
        }
        if (metadata.icon && !this.isValidIpfsUrl(metadata.icon)) {
            throw new Error('Invalid icon IPFS URL');
        }
        if (metadata.banner && !this.isValidIpfsUrl(metadata.banner)) {
            throw new Error('Invalid banner IPFS URL');
        }
    }
    isValidIpfsUrl(url) {
        return url.startsWith('ipfs://') || url.startsWith('Qm') || url.startsWith('bafy');
    }
}
export function createMetadata(name, description, options = {}) {
    return {
        version: '1.0',
        name,
        description,
        icon: options.icon || '',
        banner: options.banner || '',
        category: options.category || 'general',
        rules: options.rules || ['Be respectful', 'No spam'],
        banlist: options.banlist || '',
        adminlist: options.adminlist || '',
        createdAt: Math.floor(Date.now() / 1000),
        links: options.links,
    };
}
//# sourceMappingURL=metadata-uploader.js.map