#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Libp2pNode, PeerDiscovery, PubSubMessaging, StarTopology, DEFAULT_BOOTSTRAP_NODES, } from '@accord/core';
import Header from '../components/Header';
import Footer from '../components/Footer';
const WebRTCTest = () => {
    const [screen, setScreen] = useState('menu');
    const [node, setNode] = useState(null);
    const [topology, setTopology] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [nodeStarted, setNodeStarted] = useState(false);
    const [joinedAccord, setJoinedAccord] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState('accordId');
    const [messages, setMessages] = useState([]);
    const [currentAccordId, setCurrentAccordId] = useState('');
    const [tempData, setTempData] = useState({});
    useEffect(() => {
        return () => {
            if (topology) {
                topology.leaveAccord().catch(console.error);
            }
            if (node) {
                node.stop().catch(console.error);
            }
        };
    }, [node, topology]);
    const menuItems = [
        { label: '🚀 Start libp2p Node', value: 'startNode' },
        { label: '🌐 Join Accord (WebRTC)', value: 'joinAccord' },
        { label: '📤 Send Message', value: 'sendMessage' },
        { label: '📊 Get Status', value: 'getStatus' },
        { label: '👋 Leave Accord', value: 'leaveAccord' },
        { label: '❌ Exit', value: 'exit' },
    ];
    const handleMenuSelect = async (item) => {
        if (item.value === 'exit') {
            if (topology) {
                await topology.leaveAccord();
            }
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
        if (['sendMessage', 'getStatus', 'leaveAccord'].includes(item.value) &&
            !joinedAccord) {
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
                case 'joinAccord':
                    const discovery = new PeerDiscovery(node.getNode());
                    const messaging = new PubSubMessaging(node.getNode());
                    const starTopology = new StarTopology(node.getNode(), discovery, messaging);
                    starTopology.onMessage((message) => {
                        setMessages((prev) => [...prev, message]);
                    });
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
                        setTempData({ ...tempData, from: value, step: 'message' });
                        setInputMode('message');
                        setInputValue('');
                        setLoading(false);
                        setScreen('input');
                    }
                    else if (tempData.step === 'message') {
                        topology.sendMessage(value, tempData.from);
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
            const status = topology.getStatus();
            setResult({
                message: '📊 WebRTC Status',
                topology: status.topology,
                host: status.host,
                connections: status.connections,
                messageCount: messages.length,
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
    const handleLeaveAccord = async () => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            await topology.leaveAccord();
            setJoinedAccord(false);
            setCurrentAccordId('');
            setMessages([]);
            setTopology(null);
            setResult({
                message: '✅ Left Accord',
            });
        }
        catch (err) {
            setError(`Failed to leave Accord: ${err.message}`);
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
        React.createElement(Header, { title: "WEBRTC TEST", subtitle: "Star Topology with Host Election" }),
        React.createElement(Box, { marginY: 1, flexDirection: "column" },
            screen === 'menu' && (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, null,
                        nodeStarted ? (React.createElement(Text, { color: "green" }, "\u2705 Node Running")) : (React.createElement(Text, { color: "yellow" }, "\u26A0\uFE0F  Node Not Started")),
                        joinedAccord && (React.createElement(Text, { color: "cyan" },
                            " \u2022 Joined: ",
                            currentAccordId)))),
                joinedAccord && topology && (React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
                    React.createElement(Text, { color: "cyan" },
                        "Role:",
                        ' ',
                        topology.isHost() ? (React.createElement(Text, { color: "magenta" }, "\uD83C\uDF1F HOST")) : (React.createElement(Text, { color: "blue" }, "\uD83D\uDC64 PEER"))),
                    React.createElement(Text, null,
                        "Connected:",
                        ' ',
                        topology.getState().connectedPeers.length,
                        " peer(s)"))),
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
                    result?.role && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Role: "),
                        React.createElement(Text, null, result.role === 'host' ? (React.createElement(Text, { color: "magenta" }, "\uD83C\uDF1F HOST")) : (React.createElement(Text, { color: "blue" }, "\uD83D\uDC64 PEER"))))),
                    result?.hostInfo && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Host Info:"),
                        React.createElement(Text, null,
                            "  Peer ID: ",
                            result.hostInfo.peerId.slice(0, 20),
                            "..."),
                        React.createElement(Text, null,
                            "  Elected: ",
                            new Date(result.hostInfo.electedAt).toLocaleTimeString()))),
                    typeof result?.discoveredPeers !== 'undefined' && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" },
                            "Discovered Peers: ",
                            result.discoveredPeers))),
                    result?.topology && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "Topology Status:"),
                        React.createElement(Text, null,
                            "  Accord: ",
                            result.topology.accordId),
                        React.createElement(Text, null,
                            "  Role: ",
                            result.topology.role),
                        React.createElement(Text, null,
                            "  Connected: ",
                            result.topology.connectedPeers.length),
                        React.createElement(Text, null,
                            "  Messages: ",
                            result.topology.messageCount))),
                    result?.connections && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan" }, "WebRTC Connections:"),
                        React.createElement(Text, null,
                            "  Count: ",
                            result.connections.connectionCount),
                        React.createElement(Text, null,
                            "  Is Host: ",
                            result.connections.isHost ? 'Yes' : 'No'))),
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
                            new Date(msg.timestamp).toLocaleTimeString(),
                            "]"),
                        React.createElement(Text, null,
                            "Type: ",
                            msg.type),
                        React.createElement(Text, null,
                            "From: ",
                            msg.from.slice(0, 20),
                            "..."),
                        msg.payload && msg.payload.text && (React.createElement(Text, { color: "cyan" },
                            "\"",
                            msg.payload.text,
                            "\""))))),
                    messages.length > 5 && (React.createElement(Text, { dimColor: true },
                        "... and ",
                        messages.length - 5,
                        " more")))),
                React.createElement(Box, { marginTop: 2 },
                    React.createElement(Text, { dimColor: true }, "Press any key to continue..."))))),
        React.createElement(Footer, { onBack: handleBack, showBack: screen !== 'menu' })));
};
render(React.createElement(WebRTCTest, null));
//# sourceMappingURL=webrtc.js.map