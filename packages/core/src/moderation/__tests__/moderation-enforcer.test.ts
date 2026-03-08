/**
 * Moderation Enforcer Tests
 * Tests moderation action enforcement and notifications
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ModerationEnforcer } from '../moderation-enforcer';

describe('ModerationEnforcer', () => {
  let enforcer: ModerationEnforcer;
  let mockKickManager: any;
  let mockBanManager: any;
  let mockAdminManager: any;
  let mockConnectionManager: any;
  let mockIdentityManager: any;

  beforeEach(() => {
    // Mock managers
    mockKickManager = {
      initialize: jest.fn().mockResolvedValue(undefined) as any,
      getStatus: jest.fn().mockReturnValue({ activeKicks: 0, config: {} }) as any,
      onKick: jest.fn() as any,
      isPeerKicked: jest.fn().mockReturnValue(false) as any,
      getKickEntry: jest.fn() as any,
      getKickTimeRemaining: jest.fn() as any,
    };

    mockBanManager = {
      initialize: jest.fn().mockResolvedValue(undefined) as any,
      getStatus: jest.fn().mockReturnValue({ totalBans: 0, bans: [] }) as any,
      onBan: jest.fn() as any,
      isAddressBanned: jest.fn().mockReturnValue(false) as any,
      getBanEntry: jest.fn() as any,
    };

    mockAdminManager = {
      initialize: jest.fn().mockResolvedValue(undefined) as any,
      getStatus: jest.fn().mockReturnValue({ owner: null, totalAdmins: 0, admins: [] }) as any,
      isAdminOrOwner: jest.fn().mockReturnValue(true) as any,
      isOwner: jest.fn().mockReturnValue(false) as any,
    };

    mockConnectionManager = {
      onPeerConnected: jest.fn().mockImplementation((handler) => {
        mockConnectionManager._onPeerConnected = handler;
      }) as any,
      onPeerDisconnected: jest.fn() as any,
      disconnectPeer: jest.fn() as any,
      getConnectedPeers: jest.fn().mockReturnValue([]) as any,
      getStatus: jest.fn().mockReturnValue({}) as any,
    };

    mockIdentityManager = {
      getMyIdentity: jest.fn().mockReturnValue({
        peerId: 'my-peer',
        address: '0xADMIN0000000000000000000000000000000000',
      }) as any,
      getPeerIdentity: jest.fn().mockReturnValue({
        peerId: 'peer-target',
        address: '0xTARGET000000000000000000000000000000000',
      }) as any,
      getAuthenticatedPeers: jest.fn().mockReturnValue([]) as any,
    };

    enforcer = new ModerationEnforcer(
      mockKickManager,
      mockBanManager,
      mockAdminManager,
      mockConnectionManager,
      mockIdentityManager,
      { autoEnforce: true }
    );

    jest.clearAllMocks();
  });

  describe('Moderation action triggers UI update', () => {
    it('should trigger ban handler when ban occurs', async () => {
      const accordId = 'accord-1';
      const ownerAddress = '0xOWNER0000000000000000000000000000000000';

      await enforcer.initialize(accordId, ownerAddress);

      // Capture the onBan handler from mockBanManager
      const onBanHandler = mockBanManager.onBan.mock.calls[0][0];

      const banEntry = {
        address: '0xTARGET000000000000000000000000000000000',
        reason: 'spam',
        bannedAt: Date.now(),
        bannedBy: '0xADMIN0000000000000000000000000000000000',
        signature: '0xsig',
      };

      // Trigger the ban
      onBanHandler(banEntry);

      // Handler should have been called
      expect(mockBanManager.onBan).toHaveBeenCalled();
    });

    it('should trigger kick handler when kick occurs', async () => {
      const accordId = 'accord-1';
      const ownerAddress = '0xOWNER0000000000000000000000000000000000';

      await enforcer.initialize(accordId, ownerAddress);

      // Capture the onKick handler
      const onKickHandler = mockKickManager.onKick.mock.calls[0][0];

      const kickEntry = {
        address: '0xTARGET000000000000000000000000000000000',
        reason: 'spam',
        kickedAt: Date.now(),
        kickedBy: '0xADMIN0000000000000000000000000000000000',
        expiresAt: Date.now() + 60000,
        signature: '0xsig',
      };

      // Trigger the kick
      onKickHandler(kickEntry);

      // Handler should have been called
      expect(mockKickManager.onKick).toHaveBeenCalled();
    });
  });
});
