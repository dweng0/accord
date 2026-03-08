/**
 * IPFS Metadata Uploader
 * Handles uploading Accord metadata to IPFS using Pinata
 */

import pinataSDK from '@pinata/sdk';
import { AccordMetadata } from '../types';
import fs from 'fs';
import path from 'path';

export interface PinataConfig {
  apiKey: string;
  secretApiKey: string;
}

export class MetadataUploader {
  private pinata: any;

  constructor(config: PinataConfig) {
    this.pinata = new pinataSDK(config.apiKey, config.secretApiKey);
  }

  /**
   * Test Pinata authentication
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const result = await this.pinata.testAuthentication();
      return result.authenticated === true;
    } catch (error) {
      console.error('Pinata authentication failed:', error);
      return false;
    }
  }

  /**
   * Upload Accord metadata to IPFS
   */
  async uploadMetadata(metadata: AccordMetadata): Promise<string> {
    try {
      // Validate metadata
      this.validateMetadata(metadata);

      // Upload JSON to IPFS
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
    } catch (error: any) {
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }
  }

  /**
   * Upload an image file to IPFS
   */
  async uploadImage(filePath: string): Promise<string> {
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
    } catch (error: any) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload multiple images (icon and banner)
   */
  async uploadImages(iconPath?: string, bannerPath?: string): Promise<{
    icon?: string;
    banner?: string;
  }> {
    const result: { icon?: string; banner?: string } = {};

    if (iconPath) {
      result.icon = await this.uploadImage(iconPath);
    }

    if (bannerPath) {
      result.banner = await this.uploadImage(bannerPath);
    }

    return result;
  }

  /**
   * Upload ban list to IPFS
   */
  async uploadBanList(banList: any): Promise<string> {
    try {
      const result = await this.pinata.pinJSONToIPFS(banList, {
        pinataMetadata: {
          name: 'banlist',
        },
      });

      return `ipfs://${result.IpfsHash}`;
    } catch (error: any) {
      throw new Error(`Failed to upload ban list: ${error.message}`);
    }
  }

  /**
   * Upload admin list to IPFS
   */
  async uploadAdminList(adminList: any): Promise<string> {
    try {
      const result = await this.pinata.pinJSONToIPFS(adminList, {
        pinataMetadata: {
          name: 'adminlist',
        },
      });

      return `ipfs://${result.IpfsHash}`;
    } catch (error: any) {
      throw new Error(`Failed to upload admin list: ${error.message}`);
    }
  }

  /**
   * Unpin content from IPFS (to save space)
   */
  async unpin(ipfsHash: string): Promise<void> {
    try {
      await this.pinata.unpin(ipfsHash);
      console.log(`🗑️  Unpinned: ${ipfsHash}`);
    } catch (error: any) {
      throw new Error(`Failed to unpin: ${error.message}`);
    }
  }

  /**
   * List all pinned files
   */
  async listPinned(): Promise<any[]> {
    try {
      const result = await this.pinata.pinList({ status: 'pinned' });
      return result.rows;
    } catch (error: any) {
      throw new Error(`Failed to list pinned files: ${error.message}`);
    }
  }

  /**
   * Validate metadata structure
   */
  private validateMetadata(metadata: AccordMetadata): void {
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

    // Optional: validate IPFS URLs
    if (metadata.icon && !this.isValidIpfsUrl(metadata.icon)) {
      throw new Error('Invalid icon IPFS URL');
    }

    if (metadata.banner && !this.isValidIpfsUrl(metadata.banner)) {
      throw new Error('Invalid banner IPFS URL');
    }
  }

  /**
   * Check if URL is valid IPFS format
   */
  private isValidIpfsUrl(url: string): boolean {
    return url.startsWith('ipfs://') || url.startsWith('Qm') || url.startsWith('bafy');
  }
}

/**
 * Helper function to create metadata object
 */
export function createMetadata(
  name: string,
  description: string,
  options: {
    icon?: string;
    banner?: string;
    category?: string;
    rules?: string[];
    banlist?: string;
    adminlist?: string;
    links?: {
      website?: string;
      twitter?: string;
      discord?: string;
    };
  } = {}
): AccordMetadata {
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
