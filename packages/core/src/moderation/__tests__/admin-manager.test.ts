/**
 * Admin Manager Tests
 * Tests admin role management and permissions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AdminManager } from '../admin-manager';

describe('AdminManager', () => {
  let manager: AdminManager;
  let mockMessaging: any;
  let mockIdentityManager: any;

  beforeEach(() => {
    // Mock PubSubMessaging
    mockMessaging = {
      subscribe: jest.fn().mockImplementation((accordId, handler) => {
        mockMessaging._handler = handler;
        return Promise.resolve();
      }),
      publish: jest.fn(),
      unsubscribe: jest.fn(),
    };

    // Mock PeerIdentityManager with non-owner identity
    mockIdentityManager = {
      getMyIdentity: jest.fn().mockReturnValue({
        peerId: 'my-peer',
        address: '0xNONOWNER0000000000000000000000000000000000',
      }),
      getPeerIdentity: jest.fn().mockReturnValue({
        peerId: 'peer-target',
        address: '0xTARGET0000000000000000000000000000000000',
        verified: true,
      }),
    };

    manager = new AdminManager(mockMessaging, mockIdentityManager);
    jest.clearAllMocks();
  });

  describe('Verify admin action authorization', () => {
    it('should reject admin add when caller is not owner', async () => {
      const accordId = 'accord-1';
      const ownerAddress = '0xOWNER0000000000000000000000000000000000';

      await manager.initialize(accordId, ownerAddress);

      // Current identity is non-owner
      const targetAddress = '0xNEWADMIN000000000000000000000000000000';

      await expect(manager.addAdmin(targetAddress, 'moderator')).rejects.toThrow(
        'Only owner can add admins'
      );
    });

    it('should allow owner to add admins', async () => {
      const accordId = 'accord-1';
      const ownerAddress = '0xOWNER0000000000000000000000000000000000';

      await manager.initialize(accordId, ownerAddress);

      // Mock identity as owner
      mockIdentityManager.getMyIdentity.mockReturnValue({
        peerId: 'my-peer',
        address: ownerAddress,
      });

      const targetAddress = '0xNEWADMIN000000000000000000000000000000';

      const adminEntry = await manager.addAdmin(targetAddress, 'moderator');

      expect(adminEntry.address).toBe(targetAddress.toLowerCase());
      expect(adminEntry.role).toBe('moderator');
    });
  });
});
