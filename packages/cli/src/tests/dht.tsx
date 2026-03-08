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
  DEFAULT_BOOTSTRAP_NODES,
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
  | 'announceAccord'
  | 'findPeers'
  | 'subscribe'
  | 'sendMessage'
  | 'getStatus'
  | 'input'
  | 'result'
  | 'loading';

const DHTTest: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [node, setNode] = useState<Libp2pNode | null>(null);
  const [discovery, setDiscovery] = useState<PeerDiscovery | null>(null);
  const [messaging, setMessaging] = useState<PubSubMessaging | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [nodeStarted, setNodeStarted] = useState(false);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<
    'accordId' | 'message' | 'from'
  >('accordId');

  // Message tracking
  const [messages, setMessages] = useState<any[]>([]);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  // Temporary storage for multi-step operations
  const [tempData, setTempData] = useState<any>({});

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (node) {
        node.stop().catch(console.error);
      }
    };
  }, [node]);

  const menuItems: MenuItem[] = [
    { label: '🚀 Start libp2p Node', value: 'startNode' },
    { label: '📢 Announce to Accord', value: 'announceAccord' },
    { label: '🔍 Find Peers in Accord', value: 'findPeers' },
    { label: '📥 Subscribe to Accord', value: 'subscribe' },
    { label: '📤 Send Message', value: 'sendMessage' },
    { label: '📊 Get Node Status', value: 'getStatus' },
    { label: '❌ Exit', value: 'exit' },
  ];

  const handleMenuSelect = async (item: MenuItem) => {
    if (item.value === 'exit') {
      if (node) {
        await node.stop();
      }
      process.exit(0);
    }

    // Check if node is started for operations that require it
    if (item.value !== 'startNode' && !nodeStarted) {
      setError('Please start the node first!');
      setScreen('result');
      return;
    }

    switch (item.value) {
      case 'startNode':
        await handleStartNode();
        break;
      case 'announceAccord':
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'announce' });
        break;
      case 'findPeers':
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'findPeers' });
        break;
      case 'subscribe':
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'subscribe' });
        break;
      case 'sendMessage':
        if (subscribedTopics.length === 0) {
          setError('Please subscribe to an Accord first!');
          setScreen('result');
          return;
        }
        setInputMode('accordId');
        setScreen('input');
        setTempData({ action: 'sendMessage', step: 'accordId' });
        break;
      case 'getStatus':
        await handleGetStatus();
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

      const peerDiscovery = new PeerDiscovery(libp2pNode.getNode());
      const pubsub = new PubSubMessaging(libp2pNode.getNode());

      setNode(libp2pNode);
      setDiscovery(peerDiscovery);
      setMessaging(pubsub);
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
        case 'announce':
          await discovery!.announceAccord(value);
          setResult({
            message: `✅ Announced to Accord: ${value}`,
            accordId: value,
          });
          setScreen('result');
          break;

        case 'findPeers':
          const peers = await discovery!.findPeers(value);
          setResult({
            message: `🔍 Found ${peers.length} peer(s)`,
            peers,
            accordId: value,
          });
          setScreen('result');
          break;

        case 'subscribe':
          await messaging!.subscribe(value, (message: any, from: string) => {
            const newMsg = {
              ...message,
              from,
              receivedAt: Date.now(),
            };
            setMessages((prev) => [...prev, newMsg]);
          });
          setSubscribedTopics((prev) => [...prev, value]);
          setResult({
            message: `✅ Subscribed to Accord: ${value}`,
            accordId: value,
          });
          setScreen('result');
          break;

        case 'sendMessage':
          if (tempData.step === 'accordId') {
            // First step: get accord ID
            setTempData({ ...tempData, accordId: value, step: 'from' });
            setInputMode('from');
            setInputValue('');
            setLoading(false);
            setScreen('input');
          } else if (tempData.step === 'from') {
            // Second step: get sender name
            setTempData({ ...tempData, from: value, step: 'message' });
            setInputMode('message');
            setInputValue('');
            setLoading(false);
            setScreen('input');
          } else if (tempData.step === 'message') {
            // Third step: send message
            await messaging!.sendChatMessage(
              tempData.accordId,
              value,
              tempData.from
            );
            setResult({
              message: `✅ Message sent to Accord: ${tempData.accordId}`,
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
      const nodeStatus = node!.getStatus();
      const dhtStatus = discovery!.getDHTStatus();
      const pubsubStatus = messaging!.getStatus();
      const discoveredPeers = discovery!.getDiscoveredPeers();

      setResult({
        message: '📊 Node Status',
        node: nodeStatus,
        dht: dhtStatus,
        pubsub: pubsubStatus,
        discoveredPeers: discoveredPeers.length,
        subscribedTopics,
        messages: messages.length,
      });
    } catch (err: any) {
      setError(`Failed to get status: ${err.message}`);
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
      <Header title="DHT TEST" subtitle="libp2p Peer Discovery & Messaging" />

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
              </Text>
            </Box>
            {subscribedTopics.length > 0 && (
              <Box marginBottom={1} flexDirection="column">
                <Text color="cyan">Subscribed Topics:</Text>
                {subscribedTopics.map((topic, i) => (
                  <Text key={i}>  • {topic}</Text>
                ))}
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

                {result?.accordId && (
                  <Box marginTop={1}>
                    <Text color="cyan">Accord ID: </Text>
                    <Text>{result.accordId}</Text>
                  </Box>
                )}

                {result?.peers && result.peers.length > 0 && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Discovered Peers:</Text>
                    {result.peers.map((peer: any, i: number) => (
                      <Box key={i} flexDirection="column" marginLeft={2}>
                        <Text>  • Peer ID: {peer.peerId}</Text>
                        <Text>    Addresses: {peer.multiaddrs.length}</Text>
                      </Box>
                    ))}
                  </Box>
                )}

                {result?.node && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">Node Status:</Text>
                    <Text>  • Started: {result.node.started ? 'Yes' : 'No'}</Text>
                    <Text>  • Peer Count: {result.node.peerCount}</Text>
                  </Box>
                )}

                {result?.dht && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">DHT Status:</Text>
                    <Text>  • Enabled: {result.dht.enabled ? 'Yes' : 'No'}</Text>
                    <Text>  • Mode: {result.dht.mode}</Text>
                    <Text>  • Routing Table: {result.dht.routingTableSize} entries</Text>
                  </Box>
                )}

                {result?.pubsub && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="cyan">PubSub Status:</Text>
                    <Text>  • Enabled: {result.pubsub.enabled ? 'Yes' : 'No'}</Text>
                    <Text>  • Topics: {result.pubsub.topics.length}</Text>
                    <Text>  • Total Peers: {result.pubsub.totalPeers}</Text>
                  </Box>
                )}

                {typeof result?.discoveredPeers !== 'undefined' && (
                  <Box marginTop={1}>
                    <Text color="cyan">Discovered Peers: {result.discoveredPeers}</Text>
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
                      [{new Date(msg.receivedAt).toLocaleTimeString()}]
                    </Text>
                    <Text>Type: {msg.type}</Text>
                    {msg.from && <Text>From: {msg.from}</Text>}
                    {msg.text && <Text>Text: {msg.text}</Text>}
                    {msg.peerId && <Text>Peer ID: {msg.peerId}</Text>}
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
render(<DHTTest />);
