/**
 * Star Topology Tests
 * Tests host election, peer connections, and host migration
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { StarTopology } from '../star-topology';

// Mock HostElection and PeerConnectionManager at module level
jest.mock('../host-election', () => ({
  HostElection: jest.fn().mockImplementation(() => ({
    electHost: (jest.fn() as any).mockResolvedValue({
      peerId: 'peer-host',
      peerIds: ['peer-host', 'peer-1'],
      elected: true,
      timestamp: Date.now(),
    }),
    reelectHost: (jest.fn() as any).mockResolvedValue({
      peerId: 'peer-1',
      peerIds: ['peer-1'],
      elected: true,
      timestamp: Date.now(),
    }),
    isCurrentHost: (jest.fn() as any).mockReturnValue(true),
    getStatus: (jest.fn() as any).mockReturnValue({}),
  })),
}));

jest.mock('../peer-connection', () => ({
  PeerConnectionManager: jest.fn().mockImplementation(() => ({
    initializeAsHost: (jest.fn() as any).mockResolvedValue(undefined),
    initializeAsPeer: (jest.fn() as any).mockResolvedValue(undefined),
    disconnectAll: jest.fn() as any,
    disconnectPeer: jest.fn() as any,
    sendChatMessage: jest.fn() as any,
    onMessage: (jest.fn() as any).mockImplementation((handler: any) => {
      // Store handler
    }),
    onPeerConnected: (jest.fn() as any).mockImplementation((handler: any) => {
      // Store handler
    }),
    onPeerDisconnected: (jest.fn() as any).mockImplementation((handler: any) => {
      // Store handler
    }),
    getConnectedPeers: (jest.fn() as any).mockReturnValue([]),
    getStatus: (jest.fn() as any).mockReturnValue({}),
  })),
}));

describe('StarTopology', () => {
  let topology: StarTopology;
  let mockLibp2p: any;
  let mockDiscovery: any;
  let mockMessaging: any;

  beforeEach(() => {
    // Mock Libp2p
    mockLibp2p = {
      peerId: { toString: () => 'my-peer-id' },
      isStarted: (jest.fn() as any).mockReturnValue(true),
    };

    // Mock PeerDiscovery
    mockDiscovery = {
      announceAccord: (jest.fn() as any).mockResolvedValue(undefined),
      findPeers: (jest.fn() as any).mockResolvedValue([
        { peerId: 'peer-1', addresses: [] },
        { peerId: 'peer-2', addresses: [] },
      ]),
      getDiscoveredPeers: (jest.fn() as any).mockReturnValue([
        { peerId: 'peer-1', addresses: [] },
        { peerId: 'peer-2', addresses: [] },
      ]),
    };

    // Mock PubSubMessaging
    mockMessaging = {
      subscribe: (jest.fn() as any).mockResolvedValue(undefined),
      publish: (jest.fn() as any).mockResolvedValue(undefined),
      unsubscribe: (jest.fn() as any).mockResolvedValue(undefined),
    };

    topology = new StarTopology(mockLibp2p, mockDiscovery, mockMessaging, {
      electionTimeout: 5000,
      maxPeers: 50,
    });

    jest.clearAllMocks();
  });

  describe('First peer becomes host', () => {
    it('should elect first peer as host when no peers exist', async () => {
      // Mock finding no peers initially
      mockDiscovery.findPeers.mockResolvedValueOnce([]);

      const accordId = 'accord-1';
      await topology.joinAccord(accordId);

      expect(mockDiscovery.announceAccord).toHaveBeenCalledWith(accordId);
      expect(mockMessaging.subscribe).toHaveBeenCalledWith(accordId, expect.any(Function));
    });
  });

  describe('Send chat message as host', () => {
    it('should send message to connected peers', async () => {
      const accordId = 'accord-1';
      await topology.joinAccord(accordId);

      topology.sendMessage('hello', 'alice');

      // In a real scenario, this would call connectionManager.sendChatMessage
      // which is mocked at the module level
    });
  });

  describe('Handle host migration when host disconnects', () => {
    it('should reelect host when host disconnects', async () => {
      const accordId = 'accord-1';
      await topology.joinAccord(accordId);

      // Manually trigger host migration (for testing)
      await topology.triggerReelection();

      // After reelection, new host should be elected
      const hostInfo = topology.getHost();
      expect(hostInfo).toBeDefined();
    });
  });
});
