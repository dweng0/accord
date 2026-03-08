#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Libp2pNode, PeerDiscovery, PubSubMessaging, DEFAULT_BOOTSTRAP_NODES, } from '@accord/core';
import Header from '../components/Header';
import Footer from '../components/Footer';
const DHTTest = () => {
    const [screen, setScreen] = useState('menu');
    const [node, setNode] = useState(null);
    const [discovery, setDiscovery] = useState(null);
    const [messaging, setMessaging] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [nodeStarted, setNodeStarted] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState('accordId');
    const [messages, setMessages] = useState([]);
    const [subscribedTopics, setSubscribedTopics] = useState([]);
    const [tempData, setTempData] = useState({});
    useEffect(() => {
        return () => {
            if (node) {
                node.stop().catch(console.error);
            }
        };
    }, [node]);
    const menuItems = [
        { label: '🚀 Start libp2p Node', value: 'startNode' },
        { label: '📢 Announce to Accord', value: 'announceAccord' },
        { label: '🔍 Find Peers in Accord', value: 'findPeers' },
        { label: '📥 Subscribe to Accord', value: 'subscribe' },
        { label: '📤 Send Message', value: 'sendMessage' },
        { label: '📊 Get Node Status', value: 'getStatus' },
        { label: '❌ Exit', value: 'exit' },
    ];
    const handleMenuSelect = async (item) => {
        if (item.value === 'exit') {
            if (node) {
                await node.stop();
            }
            process.exit(0);
        }
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
        }
        catch (err) {
            setError(`Failed to start node: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
        }
    };
    const handleInputSubmit = async (value) => {
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
                    await discovery.announceAccord(value);
                    setResult({
                        message: `✅ Announced to Accord: ${value}`,
                        accordId: value,
                    });
                    setScreen('result');
                    break;
                case 'findPeers':
                    const peers = await discovery.findPeers(value);
                    setResult({
                        message: `🔍 Found ${peers.length} peer(s)`,
                        peers,
                        accordId: value,
                    });
                    setScreen('result');
                    break;
                case 'subscribe':
                    await messaging.subscribe(value, (message, from) => {
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
                        setTempData({ ...tempData, accordId: value, step: 'from' });
                        setInputMode('from');
                        setInputValue('');
                        setLoading(false);
                        setScreen('input');
                    }
                    else if (tempData.step === 'from') {
                        setTempData({ ...tempData, from: value, step: 'message' });
                        setInputMode('message');
                        setInputValue('');
                        setLoading(false);
                        setScreen('input');
                    }
                    else if (tempData.step === 'message') {
                        await messaging.sendChatMessage(tempData.accordId, value, tempData.from);
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
        }
        catch (err) {
            setError(`Operation failed: ${err.message}`);
            setScreen('result');
        }
        finally {
            setLoading(false);
            setInputValue('');
        }
    };
    const handleGetStatus = async () => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const nodeStatus = node.getStatus();
            const dhtStatus = discovery.getDHTStatus();
            const pubsubStatus = messaging.getStatus();
            const discoveredPeers = discovery.getDiscoveredPeers();
            setResult({
                message: '📊 Node Status',
                node: nodeStatus,
                dht: dhtStatus,
                pubsub: pubsubStatus,
                discoveredPeers: discoveredPeers.length,
                subscribedTopics,
                messages: messages.length,
            });
        }
        catch (err) {
            setError(`Failed to get status: ${err.message}`);
        }
        finally {
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
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Header, { title: "DHT TEST", subtitle: "libp2p Peer Discovery & Messaging" }),
        React.createElement(Box, { marginY: 1, flexDirection: "column" },
            screen === 'menu' && (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, null, nodeStarted ? (React.createElement(Text, { color: "green" }, "\u2705 Node Running")) : (React.createElement(Text, { color: "yellow" }, "\u26A0\uFE0F  Node Not Started")))),
                subscribedTopics.length > 0 && (React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
                    React.createElement(Text, { color: "cyan" }, "Subscribed Topics:"),
                    subscribedTopics.map((topic, i) => (React.createElement(Text, { key: i },
                        "  \u2022 ",
                        topic))))),
                messages.length > 0 && (React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "magenta" },
                        "\uD83D\uDCE8 ",
                        messages.length,
                        " message(s) received"))),
                React.createElement(SelectInput, { items: menuItems, onSelect: handleMenuSelect }))),
            screen === 'input' && (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "cyan" }, renderInputPrompt())),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, '> '),
                    React.createElement(TextInput, { value: inputValue, onChange: setInputValue, onSubmit: handleInputSubmit })),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { dimColor: true }, "Press Enter to submit, Ctrl+C to cancel")))),
            screen === 'loading' && (React.createElement(Box, null,
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" }),
                    ' Processing...'))),
            screen === 'result' && (React.createElement(Box, { flexDirection: "column" },
                error ? (React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "red" },
                        "\u274C ",
                        error))) : (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                    React.createElement(Text, { color: "green", bold: true }, result?.message),
                    result?.peerId && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Peer ID:"),
                        React.createElement(Text, null, result.peerId))),
                    result?.addresses && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Addresses:"),
                        result.addresses.map((addr, i) => (React.createElement(Text, { key: i },
                            "  \u2022 ",
                            addr))))),
                    result?.accordId && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Accord ID: "),
                        React.createElement(Text, null, result.accordId))),
                    result?.peers && result.peers.length > 0 && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Discovered Peers:"),
                        result.peers.map((peer, i) => (React.createElement(Box, { key: i, flexDirection: "column", marginLeft: 2 },
                            React.createElement(Text, null,
                                "  \u2022 Peer ID: ",
                                peer.peerId),
                            React.createElement(Text, null,
                                "    Addresses: ",
                                peer.multiaddrs.length)))))),
                    result?.node && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Node Status:"),
                        React.createElement(Text, null,
                            "  \u2022 Started: ",
                            result.node.started ? 'Yes' : 'No'),
                        React.createElement(Text, null,
                            "  \u2022 Peer Count: ",
                            result.node.peerCount))),
                    result?.dht && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "DHT Status:"),
                        React.createElement(Text, null,
                            "  \u2022 Enabled: ",
                            result.dht.enabled ? 'Yes' : 'No'),
                        React.createElement(Text, null,
                            "  \u2022 Mode: ",
                            result.dht.mode),
                        React.createElement(Text, null,
                            "  \u2022 Routing Table: ",
                            result.dht.routingTableSize,
                            " entries"))),
                    result?.pubsub && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "PubSub Status:"),
                        React.createElement(Text, null,
                            "  \u2022 Enabled: ",
                            result.pubsub.enabled ? 'Yes' : 'No'),
                        React.createElement(Text, null,
                            "  \u2022 Topics: ",
                            result.pubsub.topics.length),
                        React.createElement(Text, null,
                            "  \u2022 Total Peers: ",
                            result.pubsub.totalPeers))),
                    typeof result?.discoveredPeers !== 'undefined' && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" },
                            "Discovered Peers: ",
                            result.discoveredPeers))),
                    result?.text && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Message:"),
                        React.createElement(Text, null,
                            "  From: ",
                            result.from),
                        React.createElement(Text, null,
                            "  Text: ",
                            result.text))))),
                messages.length > 0 && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                    React.createElement(Text, { color: "magenta", bold: true },
                        "\uD83D\uDCE8 Received Messages (",
                        messages.length,
                        "):"),
                    messages.slice(-5).map((msg, i) => (React.createElement(Box, { key: i, flexDirection: "column", marginLeft: 2, marginTop: 1 },
                        React.createElement(Text, { color: "gray" },
                            "[",
                            new Date(msg.receivedAt).toLocaleTimeString(),
                            "]"),
                        React.createElement(Text, null,
                            "Type: ",
                            msg.type),
                        msg.from && React.createElement(Text, null,
                            "From: ",
                            msg.from),
                        msg.text && React.createElement(Text, null,
                            "Text: ",
                            msg.text),
                        msg.peerId && React.createElement(Text, null,
                            "Peer ID: ",
                            msg.peerId)))),
                    messages.length > 5 && (React.createElement(Text, { dimColor: true },
                        "... and ",
                        messages.length - 5,
                        " more")))),
                React.createElement(Box, { marginTop: 2 },
                    React.createElement(Text, { dimColor: true }, "Press any key to continue..."))))),
        React.createElement(Footer, { onBack: handleBack, showBack: screen !== 'menu' })));
};
render(React.createElement(DHTTest, null));
//# sourceMappingURL=dht.js.map