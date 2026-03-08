#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {
  Libp2pNode,
  PeerDiscovery,
  PubSubMessaging,
  StarTopology,
  DEFAULT_BOOTSTRAP_NODES,
  DataMessage,
} from '@accord/core';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface MenuItem {
  label: string;
  value: string;
}

type Screen =
  | 'menu'
  | 'startNode'
  | 'joinAccord'
  | 'sendMessage'
  | 'getStatus'
  | 'leaveAccord'
  | 'input'
  | 'result'
  | 'loading';

const WebRTCTest: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [node, setNode] = useState<Libp2pNode | null>(null);
  const [topology, setTopology] = useState<StarTopology | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [nodeStarted, setNodeStarted] = useState(false);
  const [joinedAccord, setJoinedAccord] = useState(false);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<'accordId' | 'message' | 'from'>(
    'accordId'
  );

  // Message tracking
  const [messages, setMessages] = useState<DataMessage[]>([]);
  const [currentAccordId, setCurrentAccordId] = useState<string>('');

  // Temporary storage for multi-step operations
  const [tempData, setTempData] = useState<any>({});

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
    { label: '🚀 Start libp2p Node', value: 'startNode' },
    { label: '🌐 Join Accord (WebRTC)', value: 'joinAccord' },
    { label: '📤 Send Message', value: 'sendMessage' },
    { label: '📊 Get Status', value: 'getStatus' },
    { label: '👋 Leave Accord', value: 'leaveAccord' },
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
    if (item.value !== 'startNode' && !nodeStarted) {
      setError('Please start the node first!');
      setScreen('result');
      return;
    }

    if (
      ['sendMessage', 'getStatus', 'leaveAccord'].includes(item.value) &&
      !joinedAccord
    ) {
      setError('Please join an Accord first!');
      setScreen('result');
      return;
    }

    switch (item.value) {
      case 'startNode':
        await handleStartNode();
        break;
      case 'joinAccord':
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'joinAccord' });
        break;
      case 'sendMessage':
        setInputMode('from');
        setScreen('input');
        setTempData({ action: 'sendMessage', step: 'from' });
        break;
      case 'getStatus':
        await handleGetStatus();
        break;
      case 'leaveAccord':
        await handleLeaveAccord();
        break;
    }
  };

  const handleStartNode = async () => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const libp2pNode = new Libp2pNode({
        bootstrapNodes: DEFAULT_BOOTSTRAP_NODES,
        enableDHT: true,
        enablePubSub: true,
      });

      await libp2pNode.start();
      setNode(libp2pNode);
      setNodeStarted(true);

      setResult({
        message: '✅ Node started successfully!',
        peerId: libp2pNode.getPeerId().toString(),
        addresses: libp2pNode.getMultiaddrs(),
      });
    } catch (err: any) {
      setError(`Failed to start node: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
    }
  };

  const handleInputSubmit = async (value: string) => {
    if (!value.trim()) {
      setError('Please enter a value');
      setScreen('result');
      return;
    }

    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const action = tempData.action;

      switch (action) {
        case 'joinAccord':
          // Create topology and join Accord
          const discovery = new PeerDiscovery(node!.getNode());
          const messaging = new PubSubMessaging(node!.getNode());

          const starTopology = new StarTopology(
            node!.getNode(),
            discovery,
            messaging
          );

          // Set up message handler
          starTopology.onMessage((message: DataMessage) => {
            setMessages((prev) => [...prev, message]);
          });

          // Join Accord
          await starTopology.joinAccord(value);

          setTopology(starTopology);
          setJoinedAccord(true);
          setCurrentAccordId(value);

          const state = starTopology.getState();

          setResult({
            message: `✅ Joined Accord: ${value}`,
            role: state.role,
            hostInfo: state.hostInfo,
            discoveredPeers: state.discoveredPeers.length,
          });
          setScreen('result');
          break;

        case 'sendMessage':
          if (tempData.step === 'from') {
            // First step: get sender name
            setTempData({ ...tempData, from: value, step: 'message' });
            setInputMode('message');
            setInputValue('');
            setLoading(false);
            setScreen('input');
          } else if (tempData.step === 'message') {
            // Second step: send message
            topology!.sendMessage(value, tempData.from);
            setResult({
              message: `✅ Message sent!`,
              text: value,
              from: tempData.from,
            });
            setTempData({});
            setScreen('result');
          }
          break;
      }
    } catch (err: any) {
      setError(`Operation failed: ${err.message}`);
      setScreen('result');
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  const handleGetStatus = async () => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      const status = topology!.getStatus();

      setResult({
        message: '📊 WebRTC Status',
        topology: status.topology,
        host: status.host,
        connections: status.connections,
        messageCount: messages.length,
      });
    } catch (err: any) {
      setError(`Failed to get status: ${err.message}`);
    } finally {
      setLoading(false);
      setScreen('result');
    }
  };

  const handleLeaveAccord = async () => {
    setLoading(true);
    setError('');
    setScreen('loading');

    try {
      await topology!.leaveAccord();
      setJoinedAccord(false);
      setCurrentAccordId('');
      setMessages([]);
      setTopology(null);

      setResult({
        message: '✅ Left Accord',
      });
    } catch (err: any) {
      setError(`Failed to leave Accord: ${err.message}`);
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
      case 'from':
        return 'Enter your name:';
      case 'message':
        return 'Enter message:';
      default:
        return 'Enter value:';
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="WEBRTC TEST" subtitle="Star Topology with Host Election" />

      <Box marginY={1} flexDirection="column">
        {screen === 'menu' && (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>
                {nodeStarted ? (
                  <Text color="green">✅ Node Running</Text>
                ) : (
                  <Text color="yellow">⚠️  Node Not Started</Text>
                )}
                {joinedAccord && (
                  <Text color="cyan"> • Joined: {currentAccordId}</Text>
                )}
              </Text>
            </Box>
            {joinedAccord && topology && (
              <Box marginBottom={1} flexDirection="column">
                <Text color="cyan">
                  Role:{' '}
                  {topology.isHost() ? (
                    <Text color="magenta">🌟 HOST</Text>
                  ) : (
                    <Text color="blue">👤 PEER</Text>
                  )}
                </Text>
                <Text>
                  Connected:{' '}
                  {topology.getState().connectedPeers.length} peer(s)
                </Text>
              </Box>
            )}
            {messages.length > 0 && (
              <Box marginBottom={1}>
                <Text color="magenta">📨 {messages.length} message(s) received</Text>
              </Box>
            )}
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

                {result?.peerId && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Peer ID:</Text>
                    <Text>{result.peerId}</Text>
                  </Box>
                )}

                {result?.addresses && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Addresses:</Text>
                    {result.addresses.map((addr: string, i: number) => (
                      <Text key={i}>  • {addr}</Text>
                    ))}
                  </Box>
                )}

                {result?.role && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Role: </Text>
                    <Text>
                      {result.role === 'host' ? (
                        <Text color="magenta">🌟 HOST</Text>
                      ) : (
                        <Text color="blue">👤 PEER</Text>
                      )}
                    </Text>
                  </Box>
                )}

                {result?.hostInfo && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Host Info:</Text>
                    <Text>  Peer ID: {result.hostInfo.peerId.slice(0, 20)}...</Text>
                    <Text>  Elected: {new Date(result.hostInfo.electedAt).toLocaleTimeString()}</Text>
                  </Box>
                )}

                {typeof result?.discoveredPeers !== 'undefined' && (
                  <Box marginTop={1}>
                    <Text color="cyan">Discovered Peers: {result.discoveredPeers}</Text>
                  </Box>
                )}

                {result?.topology && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Topology Status:</Text>
                    <Text>  Accord: {result.topology.accordId}</Text>
                    <Text>  Role: {result.topology.role}</Text>
                    <Text>  Connected: {result.topology.connectedPeers.length}</Text>
                    <Text>  Messages: {result.topology.messageCount}</Text>
                  </Box>
                )}

                {result?.connections && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">WebRTC Connections:</Text>
                    <Text>  Count: {result.connections.connectionCount}</Text>
                    <Text>  Is Host: {result.connections.isHost ? 'Yes' : 'No'}</Text>
                  </Box>
                )}

                {result?.text && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Message:</Text>
                    <Text>  From: {result.from}</Text>
                    <Text>  Text: {result.text}</Text>
                  </Box>
                )}
              </Box>
            )}

            {messages.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text color="magenta" bold>
                  📨 Received Messages ({messages.length}):
                </Text>
                {messages.slice(-5).map((msg, i) => (
                  <Box key={i} flexDirection="column" marginLeft={2} marginTop={1}>
                    <Text color="gray">
                      [{new Date(msg.timestamp).toLocaleTimeString()}]
                    </Text>
                    <Text>Type: {msg.type}</Text>
                    <Text>From: {msg.from.slice(0, 20)}...</Text>
                    {msg.payload && msg.payload.text && (
                      <Text color="cyan">"{msg.payload.text}"</Text>
                    )}
                  </Box>
                ))}
                {messages.length > 5 && (
                  <Text dimColor>... and {messages.length - 5} more</Text>
                )}
              </Box>
            )}

            <Box marginTop={2}>
              <Text dimColor>Press any key to continue...</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Footer onBack={handleBack} showBack={screen !== 'menu'} />
    </Box>
  );
};

// Render the component
render(<WebRTCTest />);
