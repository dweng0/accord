#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import type { Address } from 'viem';
import {
  Libp2pNode,
  PeerDiscovery,
  PubSubMessaging,
  StarTopology,
  WalletAuth,
  PeerIdentityManager,
  KickManager,
  BanManager,
  AdminManager,
  ModerationEnforcer,
  PeerConnectionManager,
  DEFAULT_BOOTSTRAP_NODES,
} from '@accord/core';
import { useInput } from 'ink';

interface MenuItem {
  label: string;
  value: string;
}

type Screen =
  | 'menu'
  | 'input'
  | 'result'
  | 'loading';

const ModerationTest: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [node, setNode] = useState<Libp2pNode | null>(null);
  const [topology, setTopology] = useState<StarTopology | null>(null);
  const [moderationEnforcer, setModerationEnforcer] = useState<ModerationEnforcer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [nodeStarted, setNodeStarted] = useState(false);
  const [moderationInitialized, setModerationInitialized] = useState(false);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<'accordId' | 'peerId' | 'address' | 'reason' | 'duration' | 'role'>(
    'accordId'
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loading, _setLoading] = useState(false);

  // Temporary storage for multi-step operations
  const [tempData, setTempData] = useState<any>({});

  // Current state
  const [currentAccordId, setCurrentAccordId] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<Address>('0x0000000000000000000000000000000000000000' as Address);

  // Handle key press for going back
  useInput((_input, key) => {
    if (screen === 'result' && !key.ctrl) {
      handleBack();
    }
  });

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (topology) {
        topology.leaveAccord().catch(console.error);
      }
      if (node) {
        node.stop().catch(console.error);
      }
    };
  }, [node, topology]);

  const menuItems: MenuItem[] = [
    { label: '🚀 Start Node & Initialize', value: 'initialize' },
    { label: '⚡ Kick Peer', value: 'kickPeer' },
    { label: '🚫 Ban Peer', value: 'banPeer' },
    { label: '👑 Add Admin', value: 'addAdmin' },
    { label: '👤 Remove Admin', value: 'removeAdmin' },
    { label: '📊 Get Status', value: 'getStatus' },
    { label: '📜 View Moderation Log', value: 'viewLog' },
    { label: '🔍 Check Peer Status', value: 'checkPeer' },
    { label: '❌ Exit', value: 'exit' },
  ];

  const handleMenuSelect = async (item: MenuItem) => {
    if (item.value === 'exit') {
      if (topology) {
        await topology.leaveAccord();
      }
      if (node) {
        await node.stop();
      }
      process.exit(0);
    }

    // Check requirements
    if (item.value !== 'initialize' && !moderationInitialized) {
      setError('Please initialize the system first!');
      setScreen('result');
      return;
    }

    switch (item.value) {
      case 'initialize':
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'initialize', step: 'accordId' });
        break;
      case 'kickPeer':
        setInputMode('peerId');
        setScreen('input');
        setTempData({ action: 'kickPeer', step: 'peerId' });
        break;
      case 'banPeer':
        setInputMode('peerId');
        setScreen('input');
        setTempData({ action: 'banPeer', step: 'peerId' });
        break;
      case 'addAdmin':
        setInputMode('address');
        setScreen('input');
        setTempData({ action: 'addAdmin', step: 'address' });
        break;
      case 'removeAdmin':
        setInputMode('address');
        setScreen('input');
        setTempData({ action: 'removeAdmin', step: 'address' });
        break;
      case 'getStatus':
        await handleGetStatus();
        break;
      case 'viewLog':
        await handleViewLog();
        break;
      case 'checkPeer':
        setInputMode('peerId');
        setScreen('input');
        setTempData({ action: 'checkPeer', step: 'peerId' });
        break;
    }
  };

  const handleInputSubmit = async (value: string) => {
    if (!value.trim()) {
      setError('Please enter a value');
      setScreen('result');
      return;
    }

    const action = tempData.action;
    const step = tempData.step;

    try {
      switch (action) {
        case 'initialize':
          if (step === 'accordId') {
            // Move to owner address
            setTempData({ ...tempData, accordId: value, step: 'ownerAddress' });
            setInputMode('address');
            setInputValue('');
            setScreen('input');
          } else if (step === 'ownerAddress') {
            // Initialize everything
            await handleInitialize(tempData.accordId, value as Address);
          }
          break;

        case 'kickPeer':
          if (step === 'peerId') {
            setTempData({ ...tempData, targetPeerId: value, step: 'reason' });
            setInputMode('reason');
            setInputValue('');
            setScreen('input');
          } else if (step === 'reason') {
            setTempData({ ...tempData, reason: value, step: 'duration' });
            setInputMode('duration');
            setInputValue('');
            setScreen('input');
          } else if (step === 'duration') {
            await handleKickPeer(tempData.targetPeerId, tempData.reason, value);
          }
          break;

        case 'banPeer':
          if (step === 'peerId') {
            setTempData({ ...tempData, targetPeerId: value, step: 'reason' });
            setInputMode('reason');
            setInputValue('');
            setScreen('input');
          } else if (step === 'reason') {
            await handleBanPeer(tempData.targetPeerId, value);
          }
          break;

        case 'addAdmin':
          if (step === 'address') {
            setTempData({ ...tempData, targetAddress: value, step: 'role' });
            setInputMode('role');
            setInputValue('');
            setScreen('input');
          } else if (step === 'role') {
            await handleAddAdmin(tempData.targetAddress as Address, value);
          }
          break;

        case 'removeAdmin':
          await handleRemoveAdmin(value as Address);
          break;

        case 'checkPeer':
          await handleCheckPeer(value);
          break;
      }
    } catch (err: any) {
      setError(`Operation failed: ${err.message}`);
      setScreen('result');
      setInputValue('');
    }
  };

  const handleInitialize = async (accordId: string, ownerAddr: Address) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      // 1. Start libp2p node
      const libp2pNode = new Libp2pNode({
        bootstrapNodes: DEFAULT_BOOTSTRAP_NODES,
        enableDHT: true,
        enablePubSub: true,
      });

      await libp2pNode.start();
      setNode(libp2pNode);
      setNodeStarted(true);

      const peerId = libp2pNode.getPeerId().toString();

      // 2. Create components
      const discovery = new PeerDiscovery(libp2pNode.getNode());
      const messaging = new PubSubMessaging(libp2pNode.getNode());

      // 3. Create topology
      const starTopology = new StarTopology(
        libp2pNode.getNode(),
        discovery,
        messaging
      );

      await starTopology.joinAccord(accordId);
      setTopology(starTopology);

      // 4. Create auth components
      const walletAuth = new WalletAuth();
      const identityManager = new PeerIdentityManager(walletAuth, messaging);
      await identityManager.initialize(accordId, peerId);

      // 5. Create moderation components
      const kickManager = new KickManager(messaging, identityManager);
      const banManager = new BanManager(messaging, identityManager);
      const adminManager = new AdminManager(messaging, identityManager);

      // 6. Create connection manager
      const connectionManager = new PeerConnectionManager(libp2pNode.getNode(), messaging);

      // 7. Create moderation enforcer
      const enforcer = new ModerationEnforcer(
        kickManager,
        banManager,
        adminManager,
        connectionManager,
        identityManager,
        { autoEnforce: true }
      );

      // 8. Initialize everything
      await enforcer.initialize(accordId, ownerAddr);

      setModerationEnforcer(enforcer);
      setModerationInitialized(true);
      setCurrentAccordId(accordId);
      setOwnerAddress(ownerAddr);

      setResult({
        message: '✅ Moderation system initialized!',
        accordId,
        peerId,
        ownerAddress: ownerAddr,
        role: starTopology.isHost() ? 'HOST' : 'PEER',
      });
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
      setInputValue('');
      setTempData({});
    }
  };

  const handleKickPeer = async (targetPeerId: string, reason: string, durationStr: string) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const duration = parseInt(durationStr) * 60 * 1000; // Convert minutes to ms

      const kickEntry = await moderationEnforcer!.kickPeer(
        targetPeerId,
        reason,
        duration
      );

      setResult({
        message: `✅ Peer kicked successfully!`,
        targetPeerId,
        reason,
        duration: `${durationStr} minutes`,
        kickedBy: kickEntry.kickedBy,
        expiresAt: new Date(kickEntry.expiresAt).toLocaleString(),
      });
    } catch (err: any) {
      setError(`Failed to kick peer: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
      setInputValue('');
      setTempData({});
    }
  };

  const handleBanPeer = async (targetPeerId: string, reason: string) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const banEntry = await moderationEnforcer!.banPeer(
        targetPeerId,
        reason
      );

      setResult({
        message: `✅ Peer banned successfully!`,
        targetPeerId,
        reason,
        bannedBy: banEntry.bannedBy,
        bannedAt: new Date(banEntry.bannedAt).toLocaleString(),
      });
    } catch (err: any) {
      setError(`Failed to ban peer: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
      setInputValue('');
      setTempData({});
    }
  };

  const handleAddAdmin = async (targetAddress: Address, role: string) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      await moderationEnforcer!.addAdmin(targetAddress, role);

      setResult({
        message: `✅ Admin added successfully!`,
        address: targetAddress,
        role,
      });
    } catch (err: any) {
      setError(`Failed to add admin: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
      setInputValue('');
      setTempData({});
    }
  };

  const handleRemoveAdmin = async (targetAddress: Address) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const removed = await moderationEnforcer!.removeAdmin(targetAddress);

      if (removed) {
        setResult({
          message: `✅ Admin removed successfully!`,
          address: targetAddress,
        });
      } else {
        setError(`Admin not found or could not be removed`);
      }
    } catch (err: any) {
      setError(`Failed to remove admin: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
      setInputValue('');
      setTempData({});
    }
  };

  const handleGetStatus = async () => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const status = moderationEnforcer!.getStatus();

      setResult({
        message: '📊 Moderation Status',
        status,
      });
    } catch (err: any) {
      setError(`Failed to get status: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
    }
  };

  const handleViewLog = async () => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const log = moderationEnforcer!.getModerationLog();

      setResult({
        message: '📜 Moderation Log',
        log,
      });
    } catch (err: any) {
      setError(`Failed to get log: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
    }
  };

  const handleCheckPeer = async (targetPeerId: string) => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const canModerate = moderationEnforcer!.canModeratePeer(targetPeerId);

      setResult({
        message: '🔍 Peer Check',
        targetPeerId,
        canModerate,
      });
    } catch (err: any) {
      setError(`Failed to check peer: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
    }
  };

  const handleBack = () => {
    setError('');
    setResult(null);
    setInputValue('');
    setTempData({});
    setScreen('menu');
  };

  const renderInputPrompt = () => {
    switch (inputMode) {
      case 'accordId':
        return 'Enter Accord ID:';
      case 'address':
        if (tempData.step === 'ownerAddress') {
          return 'Enter Owner Address (0x...):';
        }
        return 'Enter Address (0x...):';
      case 'peerId':
        return 'Enter Peer ID:';
      case 'reason':
        return 'Enter Reason:';
      case 'duration':
        return 'Enter Duration (minutes):';
      case 'role':
        return 'Enter Role (e.g., moderator):';
      default:
        return 'Enter value:';
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">MODERATION TEST - Phase 7: Kick, Ban & Admin Management</Text>
      </Box>

      <Box marginY={1} flexDirection="column">
        {screen === 'menu' && (
          <Box flexDirection="column">
            <Box marginBottom={1} flexDirection="column">
              <Text>
                {nodeStarted ? (
                  <Text color="green">✅ Node Running</Text>
                ) : (
                  <Text color="yellow">⚠️  Node Not Started</Text>
                )}
              </Text>
              <Text>
                {moderationInitialized ? (
                  <Text color="green">✅ Moderation Initialized</Text>
                ) : (
                  <Text color="yellow">⚠️  Moderation Not Initialized</Text>
                )}
              </Text>
              {currentAccordId && (
                <Text color="cyan">Accord: {currentAccordId}</Text>
              )}
              {ownerAddress && ownerAddress !== '0x0000000000000000000000000000000000000000' && (
                <Text color="magenta">Owner: {ownerAddress.slice(0, 10)}...</Text>
              )}
            </Box>
            <SelectInput items={menuItems} onSelect={handleMenuSelect} />
          </Box>
        )}

        {screen === 'input' && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="cyan">{renderInputPrompt()}</Text>
            </Box>
            <Box>
              <Text color="gray">{'> '}</Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleInputSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Enter to submit, Ctrl+C to cancel</Text>
            </Box>
          </Box>
        )}

        {screen === 'loading' && (
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
              {' Processing...'}
            </Text>
          </Box>
        )}

        {screen === 'result' && (
          <Box flexDirection="column">
            {error ? (
              <Box marginBottom={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            ) : (
              <Box flexDirection="column" marginBottom={1}>
                <Text color="green" bold>
                  {result?.message}
                </Text>

                {result?.accordId && (
                  <Box marginTop={1}>
                    <Text color="cyan">Accord ID: </Text>
                    <Text>{result.accordId}</Text>
                  </Box>
                )}

                {result?.peerId && (
                  <Box marginTop={1}>
                    <Text color="cyan">Peer ID: </Text>
                    <Text>{result.peerId.slice(0, 30)}...</Text>
                  </Box>
                )}

                {result?.ownerAddress && (
                  <Box marginTop={1}>
                    <Text color="cyan">Owner: </Text>
                    <Text>{result.ownerAddress}</Text>
                  </Box>
                )}

                {result?.role && (
                  <Box marginTop={1}>
                    <Text color="cyan">Role: </Text>
                    <Text color={result.role === 'HOST' ? 'magenta' : 'blue'}>
                      {result.role === 'HOST' ? '🌟 HOST' : '👤 PEER'}
                    </Text>
                  </Box>
                )}

                {result?.targetPeerId && (
                  <Box marginTop={1}>
                    <Text color="cyan">Target Peer: </Text>
                    <Text>{result.targetPeerId.slice(0, 30)}...</Text>
                  </Box>
                )}

                {result?.reason && (
                  <Box marginTop={1}>
                    <Text color="cyan">Reason: </Text>
                    <Text>{result.reason}</Text>
                  </Box>
                )}

                {result?.duration && (
                  <Box marginTop={1}>
                    <Text color="cyan">Duration: </Text>
                    <Text>{result.duration}</Text>
                  </Box>
                )}

                {result?.kickedBy && (
                  <Box marginTop={1}>
                    <Text color="cyan">Kicked By: </Text>
                    <Text>{result.kickedBy.slice(0, 10)}...</Text>
                  </Box>
                )}

                {result?.bannedBy && (
                  <Box marginTop={1}>
                    <Text color="cyan">Banned By: </Text>
                    <Text>{result.bannedBy.slice(0, 10)}...</Text>
                  </Box>
                )}

                {result?.expiresAt && (
                  <Box marginTop={1}>
                    <Text color="cyan">Expires At: </Text>
                    <Text>{result.expiresAt}</Text>
                  </Box>
                )}

                {result?.bannedAt && (
                  <Box marginTop={1}>
                    <Text color="cyan">Banned At: </Text>
                    <Text>{result.bannedAt}</Text>
                  </Box>
                )}

                {result?.address && (
                  <Box marginTop={1}>
                    <Text color="cyan">Address: </Text>
                    <Text>{result.address}</Text>
                  </Box>
                )}

                {result?.status && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan" bold>Status Details:</Text>
                    <Box marginLeft={2} flexDirection="column">
                      <Text color="yellow">Kicks:</Text>
                      <Text>  Active: {result.status.kicks.activeKickCount || 0}</Text>
                      <Text color="yellow">Bans:</Text>
                      <Text>  Total: {result.status.bans.bannedCount || 0}</Text>
                      <Text color="yellow">Admins:</Text>
                      <Text>  Total: {result.status.admins.adminCount || 0}</Text>
                      <Text>  Owner: {result.status.admins.ownerAddress?.slice(0, 10)}...</Text>
                      <Text color="yellow">Actions:</Text>
                      <Text>  Logged: {result.status.actionLog?.length || 0}</Text>
                    </Box>
                  </Box>
                )}

                {result?.log && result.log.length > 0 && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan" bold>Recent Actions ({result.log.length}):</Text>
                    {result.log.slice(-10).reverse().map((action: any, i: number) => (
                      <Box key={i} marginLeft={2} marginTop={1} flexDirection="column">
                        <Text color="gray">
                          [{new Date(action.timestamp).toLocaleTimeString()}]
                        </Text>
                        <Text>
                          Type: <Text color="yellow">{action.type}</Text>
                        </Text>
                        {action.targetPeerId && (
                          <Text>Peer: {action.targetPeerId.slice(0, 20)}...</Text>
                        )}
                        {action.targetAddress && (
                          <Text>Address: {action.targetAddress.slice(0, 10)}...</Text>
                        )}
                        {action.reason && (
                          <Text>Reason: {action.reason}</Text>
                        )}
                      </Box>
                    ))}
                    {result.log.length > 10 && (
                      <Text dimColor>... and {result.log.length - 10} more</Text>
                    )}
                  </Box>
                )}

                {result?.log && result.log.length === 0 && (
                  <Box marginTop={1}>
                    <Text dimColor>No moderation actions yet</Text>
                  </Box>
                )}

                {result?.canModerate && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan" bold>Can Moderate:</Text>
                    <Box marginLeft={2}>
                      <Text>
                        Kick: {result.canModerate.canKick ?
                          <Text color="green">✅ Yes</Text> :
                          <Text color="red">❌ No</Text>
                        }
                      </Text>
                    </Box>
                    <Box marginLeft={2}>
                      <Text>
                        Ban: {result.canModerate.canBan ?
                          <Text color="green">✅ Yes</Text> :
                          <Text color="red">❌ No</Text>
                        }
                      </Text>
                    </Box>
                    {result.canModerate.reason && (
                      <Box marginLeft={2}>
                        <Text color="yellow">Reason: {result.canModerate.reason}</Text>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}

            <Box marginTop={2}>
              <Text dimColor>Press any key to continue...</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        {screen !== 'menu' && (
          <Text dimColor>Press any key to go back to menu</Text>
        )}
      </Box>
    </Box>
  );
};

// Render the component
render(<ModerationTest />);
