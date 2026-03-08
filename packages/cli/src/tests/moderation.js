#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Libp2pNode, PeerDiscovery, PubSubMessaging, StarTopology, WalletAuth, PeerIdentityManager, KickManager, BanManager, AdminManager, ModerationEnforcer, PeerConnectionManager, DEFAULT_BOOTSTRAP_NODES, } from '@accord/core';
import { useInput } from 'ink';
const ModerationTest = () => {
    const [screen, setScreen] = useState('menu');
    const [node, setNode] = useState(null);
    const [topology, setTopology] = useState(null);
    const [moderationEnforcer, setModerationEnforcer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [nodeStarted, setNodeStarted] = useState(false);
    const [moderationInitialized, setModerationInitialized] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState('accordId');
    const [_loading, _setLoading] = useState(false);
    const [tempData, setTempData] = useState({});
    const [currentAccordId, setCurrentAccordId] = useState('');
    const [ownerAddress, setOwnerAddress] = useState('0x0000000000000000000000000000000000000000');
    useInput((_input, key) => {
        if (screen === 'result' && !key.ctrl) {
            handleBack();
        }
    });
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
    const handleInputSubmit = async (value) => {
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
                        setTempData({ ...tempData, accordId: value, step: 'ownerAddress' });
                        setInputMode('address');
                        setInputValue('');
                        setScreen('input');
                    }
                    else if (step === 'ownerAddress') {
                        await handleInitialize(tempData.accordId, value);
                    }
                    break;
                case 'kickPeer':
                    if (step === 'peerId') {
                        setTempData({ ...tempData, targetPeerId: value, step: 'reason' });
                        setInputMode('reason');
                        setInputValue('');
                        setScreen('input');
                    }
                    else if (step === 'reason') {
                        setTempData({ ...tempData, reason: value, step: 'duration' });
                        setInputMode('duration');
                        setInputValue('');
                        setScreen('input');
                    }
                    else if (step === 'duration') {
                        await handleKickPeer(tempData.targetPeerId, tempData.reason, value);
                    }
                    break;
                case 'banPeer':
                    if (step === 'peerId') {
                        setTempData({ ...tempData, targetPeerId: value, step: 'reason' });
                        setInputMode('reason');
                        setInputValue('');
                        setScreen('input');
                    }
                    else if (step === 'reason') {
                        await handleBanPeer(tempData.targetPeerId, value);
                    }
                    break;
                case 'addAdmin':
                    if (step === 'address') {
                        setTempData({ ...tempData, targetAddress: value, step: 'role' });
                        setInputMode('role');
                        setInputValue('');
                        setScreen('input');
                    }
                    else if (step === 'role') {
                        await handleAddAdmin(tempData.targetAddress, value);
                    }
                    break;
                case 'removeAdmin':
                    await handleRemoveAdmin(value);
                    break;
                case 'checkPeer':
                    await handleCheckPeer(value);
                    break;
            }
        }
        catch (err) {
            setError(`Operation failed: ${err.message}`);
            setScreen('result');
            setInputValue('');
        }
    };
    const handleInitialize = async (accordId, ownerAddr) => {
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
            const peerId = libp2pNode.getPeerId().toString();
            const discovery = new PeerDiscovery(libp2pNode.getNode());
            const messaging = new PubSubMessaging(libp2pNode.getNode());
            const starTopology = new StarTopology(libp2pNode.getNode(), discovery, messaging);
            await starTopology.joinAccord(accordId);
            setTopology(starTopology);
            const walletAuth = new WalletAuth();
            const identityManager = new PeerIdentityManager(walletAuth, messaging);
            await identityManager.initialize(accordId, peerId);
            const kickManager = new KickManager(messaging, identityManager);
            const banManager = new BanManager(messaging, identityManager);
            const adminManager = new AdminManager(messaging, identityManager);
            const connectionManager = new PeerConnectionManager(libp2pNode.getNode(), messaging);
            const enforcer = new ModerationEnforcer(kickManager, banManager, adminManager, connectionManager, identityManager, { autoEnforce: true });
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
        }
        catch (err) {
            setError(`Failed to initialize: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
            setInputValue('');
            setTempData({});
        }
    };
    const handleKickPeer = async (targetPeerId, reason, durationStr) => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const duration = parseInt(durationStr) * 60 * 1000;
            const kickEntry = await moderationEnforcer.kickPeer(targetPeerId, reason, duration);
            setResult({
                message: `✅ Peer kicked successfully!`,
                targetPeerId,
                reason,
                duration: `${durationStr} minutes`,
                kickedBy: kickEntry.kickedBy,
                expiresAt: new Date(kickEntry.expiresAt).toLocaleString(),
            });
        }
        catch (err) {
            setError(`Failed to kick peer: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
            setInputValue('');
            setTempData({});
        }
    };
    const handleBanPeer = async (targetPeerId, reason) => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const banEntry = await moderationEnforcer.banPeer(targetPeerId, reason);
            setResult({
                message: `✅ Peer banned successfully!`,
                targetPeerId,
                reason,
                bannedBy: banEntry.bannedBy,
                bannedAt: new Date(banEntry.bannedAt).toLocaleString(),
            });
        }
        catch (err) {
            setError(`Failed to ban peer: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
            setInputValue('');
            setTempData({});
        }
    };
    const handleAddAdmin = async (targetAddress, role) => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            await moderationEnforcer.addAdmin(targetAddress, role);
            setResult({
                message: `✅ Admin added successfully!`,
                address: targetAddress,
                role,
            });
        }
        catch (err) {
            setError(`Failed to add admin: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
            setInputValue('');
            setTempData({});
        }
    };
    const handleRemoveAdmin = async (targetAddress) => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const removed = await moderationEnforcer.removeAdmin(targetAddress);
            if (removed) {
                setResult({
                    message: `✅ Admin removed successfully!`,
                    address: targetAddress,
                });
            }
            else {
                setError(`Admin not found or could not be removed`);
            }
        }
        catch (err) {
            setError(`Failed to remove admin: ${err.message}`);
        }
        finally {
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
            const status = moderationEnforcer.getStatus();
            setResult({
                message: '📊 Moderation Status',
                status,
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
    const handleViewLog = async () => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const log = moderationEnforcer.getModerationLog();
            setResult({
                message: '📜 Moderation Log',
                log,
            });
        }
        catch (err) {
            setError(`Failed to get log: ${err.message}`);
        }
        finally {
            setLoading(false);
            setScreen('result');
        }
    };
    const handleCheckPeer = async (targetPeerId) => {
        setLoading(true);
        setError('');
        setScreen('loading');
        try {
            const canModerate = moderationEnforcer.canModeratePeer(targetPeerId);
            setResult({
                message: '🔍 Peer Check',
                targetPeerId,
                canModerate,
            });
        }
        catch (err) {
            setError(`Failed to check peer: ${err.message}`);
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
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { bold: true, color: "cyan" }, "MODERATION TEST - Phase 7: Kick, Ban & Admin Management")),
        React.createElement(Box, { marginY: 1, flexDirection: "column" },
            screen === 'menu' && (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
                    React.createElement(Text, null, nodeStarted ? (React.createElement(Text, { color: "green" }, "\u2705 Node Running")) : (React.createElement(Text, { color: "yellow" }, "\u26A0\uFE0F  Node Not Started"))),
                    React.createElement(Text, null, moderationInitialized ? (React.createElement(Text, { color: "green" }, "\u2705 Moderation Initialized")) : (React.createElement(Text, { color: "yellow" }, "\u26A0\uFE0F  Moderation Not Initialized"))),
                    currentAccordId && (React.createElement(Text, { color: "cyan" },
                        "Accord: ",
                        currentAccordId)),
                    ownerAddress && ownerAddress !== '0x0000000000000000000000000000000000000000' && (React.createElement(Text, { color: "magenta" },
                        "Owner: ",
                        ownerAddress.slice(0, 10),
                        "..."))),
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
                    result?.accordId && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Accord ID: "),
                        React.createElement(Text, null, result.accordId))),
                    result?.peerId && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Peer ID: "),
                        React.createElement(Text, null,
                            result.peerId.slice(0, 30),
                            "..."))),
                    result?.ownerAddress && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Owner: "),
                        React.createElement(Text, null, result.ownerAddress))),
                    result?.role && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Role: "),
                        React.createElement(Text, { color: result.role === 'HOST' ? 'magenta' : 'blue' }, result.role === 'HOST' ? '🌟 HOST' : '👤 PEER'))),
                    result?.targetPeerId && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Target Peer: "),
                        React.createElement(Text, null,
                            result.targetPeerId.slice(0, 30),
                            "..."))),
                    result?.reason && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Reason: "),
                        React.createElement(Text, null, result.reason))),
                    result?.duration && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Duration: "),
                        React.createElement(Text, null, result.duration))),
                    result?.kickedBy && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Kicked By: "),
                        React.createElement(Text, null,
                            result.kickedBy.slice(0, 10),
                            "..."))),
                    result?.bannedBy && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Banned By: "),
                        React.createElement(Text, null,
                            result.bannedBy.slice(0, 10),
                            "..."))),
                    result?.expiresAt && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Expires At: "),
                        React.createElement(Text, null, result.expiresAt))),
                    result?.bannedAt && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Banned At: "),
                        React.createElement(Text, null, result.bannedAt))),
                    result?.address && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { color: "cyan" }, "Address: "),
                        React.createElement(Text, null, result.address))),
                    result?.status && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan", bold: true }, "Status Details:"),
                        React.createElement(Box, { marginLeft: 2, flexDirection: "column" },
                            React.createElement(Text, { color: "yellow" }, "Kicks:"),
                            React.createElement(Text, null,
                                "  Active: ",
                                result.status.kicks.activeKickCount || 0),
                            React.createElement(Text, { color: "yellow" }, "Bans:"),
                            React.createElement(Text, null,
                                "  Total: ",
                                result.status.bans.bannedCount || 0),
                            React.createElement(Text, { color: "yellow" }, "Admins:"),
                            React.createElement(Text, null,
                                "  Total: ",
                                result.status.admins.adminCount || 0),
                            React.createElement(Text, null,
                                "  Owner: ",
                                result.status.admins.ownerAddress?.slice(0, 10),
                                "..."),
                            React.createElement(Text, { color: "yellow" }, "Actions:"),
                            React.createElement(Text, null,
                                "  Logged: ",
                                result.status.actionLog?.length || 0)))),
                    result?.log && result.log.length > 0 && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan", bold: true },
                            "Recent Actions (",
                            result.log.length,
                            "):"),
                        result.log.slice(-10).reverse().map((action, i) => (React.createElement(Box, { key: i, marginLeft: 2, marginTop: 1, flexDirection: "column" },
                            React.createElement(Text, { color: "gray" },
                                "[",
                                new Date(action.timestamp).toLocaleTimeString(),
                                "]"),
                            React.createElement(Text, null,
                                "Type: ",
                                React.createElement(Text, { color: "yellow" }, action.type)),
                            action.targetPeerId && (React.createElement(Text, null,
                                "Peer: ",
                                action.targetPeerId.slice(0, 20),
                                "...")),
                            action.targetAddress && (React.createElement(Text, null,
                                "Address: ",
                                action.targetAddress.slice(0, 10),
                                "...")),
                            action.reason && (React.createElement(Text, null,
                                "Reason: ",
                                action.reason))))),
                        result.log.length > 10 && (React.createElement(Text, { dimColor: true },
                            "... and ",
                            result.log.length - 10,
                            " more")))),
                    result?.log && result.log.length === 0 && (React.createElement(Box, { marginTop: 1 },
                        React.createElement(Text, { dimColor: true }, "No moderation actions yet"))),
                    result?.canModerate && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                        React.createElement(Text, { color: "cyan", bold: true }, "Can Moderate:"),
                        React.createElement(Box, { marginLeft: 2 },
                            React.createElement(Text, null,
                                "Kick: ",
                                result.canModerate.canKick ?
                                    React.createElement(Text, { color: "green" }, "\u2705 Yes") :
                                    React.createElement(Text, { color: "red" }, "\u274C No"))),
                        React.createElement(Box, { marginLeft: 2 },
                            React.createElement(Text, null,
                                "Ban: ",
                                result.canModerate.canBan ?
                                    React.createElement(Text, { color: "green" }, "\u2705 Yes") :
                                    React.createElement(Text, { color: "red" }, "\u274C No"))),
                        result.canModerate.reason && (React.createElement(Box, { marginLeft: 2 },
                            React.createElement(Text, { color: "yellow" },
                                "Reason: ",
                                result.canModerate.reason))))))),
                React.createElement(Box, { marginTop: 2 },
                    React.createElement(Text, { dimColor: true }, "Press any key to continue..."))))),
        React.createElement(Box, { marginTop: 1 }, screen !== 'menu' && (React.createElement(Text, { dimColor: true }, "Press any key to go back to menu")))));
};
render(React.createElement(ModerationTest, null));
//# sourceMappingURL=moderation.js.map