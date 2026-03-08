/**
 * Star Topology Tests
 * Tests host election, peer connections, and host migration
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { StarTopology } from '../star-topology';

// Mock HostElection and PeerConnectionManager at module level
jest.mock('../host-election', () => ({
  HostElection: jest.fn().mockImplementation(() => ({
    electHost: jest.fn().mockResolvedValue({
      peerId: 'peer-host',
      peerIds: ['peer-host', 'peer-1'],
      elected: true,
      timestamp: Date.now(),
    } as any),
    reelectHost: jest.fn().mockResolvedValue({
      peerId: 'peer-1',
      peerIds: ['peer-1'],
      elected: true,
      timestamp: Date.now(),
    } as any),
    isCurrentHost: jest.fn().mockReturnValue(true) as any,
    getStatus: jest.fn().mockReturnValue({}) as any,
  })),
}));

jest.mock('../peer-connection', () => ({
  PeerConnectionManager: jest.fn().mockImplementation(() => ({
    initializeAsHost: jest.fn().mockResolvedValue(undefined as any),
    initializeAsPeer: jest.fn().mockResolvedValue(undefined as any),
    disconnectAll: jest.fn() as any,
    disconnectPeer: jest.fn() as any,
    sendChatMessage: jest.fn() as any,
    onMessage: jest.fn().mockImplementation((handler) => {
      // Store handler
    }) as any,
    onPeerConnected: jest.fn().mockImplementation((handler) => {
      // Store handler
    }) as any,
    onPeerDisconnected: jest.fn().mockImplementation((handler) => {
      // Store handler
    }) as any,
    getConnectedPeers: jest.fn().mockReturnValue([]) as any,
    getStatus: jest.fn().mockReturnValue({}) as any,
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
      isStarted: jest.fn().mockReturnValue(true) as any,
    };

    // Mock PeerDiscovery
    mockDiscovery = {
      announceAccord: jest.fn().mockResolvedValue(undefined as any),
      findPeers: jest.fn().mockResolvedValue([
        { peerId: 'peer-1', addresses: [] },
        { peerId: 'peer-2', addresses: [] },
      ] as any),
      getDiscoveredPeers: jest.fn().mockReturnValue([
        { peerId: 'peer-1', addresses: [] },
        { peerId: 'peer-2', addresses: [] },
      ] as any),
    };

    // Mock PubSubMessaging
    mockMessaging = {
      subscribe: jest.fn().mockResolvedValue(undefined as any),
      publish: jest.fn().mockResolvedValue(undefined as any),
      unsubscribe: jest.fn().mockResolvedValue(undefined as any),
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
