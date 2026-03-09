/**
 * Peer Identity Manager Tests
 * Tests peer identity storage and announcements
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PeerIdentityManager } from '../peer-identity';

describe('PeerIdentityManager', () => {
  let manager: PeerIdentityManager;
  let mockWalletAuth: any;
  let mockMessaging: any;

  beforeEach(() => {
    // Mock WalletAuth
    mockWalletAuth = {
      verifyCredentials: (jest.fn() as any).mockResolvedValue({
        address: '0x1111111111111111111111111111111111111111',
        peerId: 'peer-1',
        verified: true,
        verifiedAt: Date.now(),
      }),
      getVerifiedIdentity: jest.fn() as any,
      isVerified: jest.fn() as any,
    };

    // Mock PubSubMessaging
    mockMessaging = {
      subscribe: (jest.fn() as any).mockImplementation((accordId: any, handler: any) => {
        // Store handler for later triggering
        mockMessaging._handler = handler;
        return Promise.resolve();
      }),
      publish: (jest.fn() as any).mockResolvedValue(undefined),
      unsubscribe: (jest.fn() as any).mockResolvedValue(undefined),
    };

    manager = new PeerIdentityManager(mockWalletAuth, mockMessaging);
    jest.clearAllMocks();
  });

  describe('Store peer identity', () => {
    it('should store peer identity from announcement', async () => {
      const accordId = 'accord-1';
      const myPeerId = 'my-peer';

      await manager.initialize(accordId, myPeerId);

      // Trigger identity announcement
      const announcement = {
        type: 'identity-announcement',
        peerId: 'peer-2',
        address: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
        timestamp: Date.now(),
      };

      mockMessaging._handler(announcement, 'peer-2');

      const identity = manager.getPeerIdentity('peer-2');
      expect(identity).toBeDefined();
      expect(identity?.address).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('Get peer identity', () => {
    it('should return stored peer identity', async () => {
      const accordId = 'accord-1';
      const myPeerId = 'my-peer';

      await manager.initialize(accordId, myPeerId);

      const announcement = {
        type: 'identity-announcement',
        peerId: 'peer-2',
        address: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
        timestamp: Date.now(),
      };

      mockMessaging._handler(announcement, 'peer-2');

      const identity = manager.getPeerIdentity('peer-2');
      expect(identity?.peerId).toBe('peer-2');
      expect(identity?.address).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('Get my own identity', () => {
    it('should return my own identity after authentication', async () => {
      const accordId = 'accord-1';
      const myPeerId = 'my-peer';

      await manager.initialize(accordId, myPeerId);

      const credentials = {
        address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
        signature: '0xsig' as `0x${string}`,
        challenge: {
          message: 'test',
          nonce: 'nonce',
          timestamp: Date.now(),
          accordId,
        },
      };

      await manager.authenticateSelf(credentials);

      const myIdentity = manager.getMyIdentity();
      expect(myIdentity.peerId).toBe(myPeerId);
      expect(myIdentity.address).toBe('0x1111111111111111111111111111111111111111');
    });
  });
});
