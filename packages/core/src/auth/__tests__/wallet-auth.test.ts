/**
 * Wallet Auth Tests
 * Tests challenge creation and internal challenge management
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { WalletAuth } from '../wallet-auth';

describe('WalletAuth', () => {
  let walletAuth: WalletAuth;

  beforeEach(() => {
    walletAuth = new WalletAuth();
  });

  describe('Verify valid authentication credentials', () => {
    it('should create and store challenges', () => {
      const accordId = 'accord-1';
      const peerId = 'peer-1';

      const challenge = walletAuth.createChallenge(accordId, peerId);

      expect(challenge).toBeDefined();
      expect(challenge.accordId).toBe(accordId);
      expect(challenge.nonce).toBeDefined();
      expect(challenge.timestamp).toBeDefined();
      expect(challenge.message).toContain(accordId);
    });
  });

  describe('Verify authentication with wrong signature', () => {
    it('should reject credentials with no stored challenge', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const signature = '0xab'.repeat(65) as `0x${string}`;

      const credentials = {
        address: address as `0x${string}`,
        signature,
        challenge: {
          message: 'test',
          nonce: 'nonce',
          timestamp: Date.now(),
          accordId: 'accord-1',
        },
      };

      await expect(walletAuth.verifyCredentials(credentials, 'peer-unknown')).rejects.toThrow(
        'No challenge found for peer'
      );
    });
  });
});
