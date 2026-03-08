/**
 * Metadata Uploader Tests
 * Tests IPFS metadata upload validation and error handling
 */

import { jest, describe, it, expect } from '@jest/globals';
import { MetadataUploader } from '../metadata-uploader';

// We can't easily mock Pinata with ESM, so test validation logic directly
describe('MetadataUploader Validation', () => {
  describe('Upload metadata with invalid name', () => {
    it('should reject metadata with empty name', () => {
      const metadata = {
        version: '1.0',
        name: '',
        description: 'Test description',
        category: 'general',
        rules: ['Rule 1'],
        icon: '',
        banner: '',
        createdAt: Math.floor(Date.now() / 1000),
        links: {},
        banlist: '',
        adminlist: '',
      };

      // Create uploader just to access validation
      const uploader = new MetadataUploader({
        apiKey: 'test-key',
        secretApiKey: 'test-secret',
      });

      // Try to call uploadMetadata - it should fail validation before Pinata call
      expect(uploader.uploadMetadata(metadata)).rejects.toThrow(
        'Metadata must have a name'
      );
    });
  });

  describe('Upload metadata without category', () => {
    it('should reject metadata without category', () => {
      const metadata = {
        version: '1.0',
        name: 'Test Accord',
        description: 'Test description',
        category: '',
        rules: ['Rule 1'],
        icon: '',
        banner: '',
        createdAt: Math.floor(Date.now() / 1000),
        links: {},
        banlist: '',
        adminlist: '',
      };

      const uploader = new MetadataUploader({
        apiKey: 'test-key',
        secretApiKey: 'test-secret',
      });

      expect(uploader.uploadMetadata(metadata)).rejects.toThrow(
        'Metadata must have a category'
      );
    });
  });
});
