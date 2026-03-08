#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { ethers } from 'ethers';
import Header from '../components/Header';
import Footer from '../components/Footer';
const ACCORD_REGISTRY_ABI = [
    "function registerAccord(string memory ipfsHash) external payable returns (bytes32)",
    "function getAccord(bytes32 accordId) external view returns (tuple(address owner, string ipfsHash, uint256 createdAt, bool active))",
    "function getAllAccords() external view returns (bytes32[] memory)",
    "function getActiveAccords() external view returns (bytes32[] memory)",
    "function getAccordCount() external view returns (uint256)",
    "function registrationFee() external view returns (uint256)",
    "function unregistrationFee() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function getBalance() external view returns (uint256)",
    "function unregisterAccord(bytes32 accordId) external payable",
    "function updateMetadata(bytes32 accordId, string memory newIpfsHash) external",
    "event AccordRegistered(bytes32 indexed accordId, address indexed owner, string ipfsHash, uint256 timestamp)"
];
const BlockchainTest = () => {
    const [screen, setScreen] = useState('menu');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [contractAddress, setContractAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState('address');
    const [contractInfo, setContractInfo] = useState(null);
    useEffect(() => {
        const initProvider = async () => {
            try {
                const p = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
                setProvider(p);
                const s = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p);
                setSigner(s);
            }
            catch (err) {
                setError('Failed to connect to Hardhat node. Make sure it\'s running!');
            }
        };
        initProvider();
    }, []);
    const menuItems = [
        { label: '🚀 Deploy New Contract', value: 'deploy' },
        { label: '🔌 Connect to Existing Contract', value: 'connect' },
        ...(contract ? [
            { label: '📊 Contract Info', value: 'info' },
            { label: '➕ Register Accord', value: 'register' },
            { label: '📋 List All Accords', value: 'list' },
            { label: '🔍 Get Accord Details', value: 'getAccord' },
            { label: '✏️  Update Metadata', value: 'update' },
            { label: '❌ Unregister Accord', value: 'unregister' },
        ] : []),
        { label: '⬅️  Back to Main Menu', value: 'exit' },
    ];
    const handleMenuSelect = (item) => {
        if (item.value === 'exit') {
            process.exit(0);
        }
        setScreen(item.value);
        setError('');
        setResult(null);
    };
    const deployContract = async () => {
        if (!signer) {
            setError('No signer available');
            return;
        }
        setScreen('deploying');
        setLoading(true);
        try {
            const factory = new ethers.ContractFactory(ACCORD_REGISTRY_ABI, '0x', signer);
            setError('To deploy, run: cd packages/contracts && npx hardhat run scripts/deploy.js --network localhost');
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const connectToContract = async (address) => {
        if (!signer) {
            setError('No signer available');
            return;
        }
        setLoading(true);
        try {
            const c = new ethers.Contract(address, ACCORD_REGISTRY_ABI, signer);
            setContract(c);
            setContractAddress(address);
            const [owner, regFee, unregFee, count, balance] = await Promise.all([
                c.owner(),
                c.registrationFee(),
                c.unregistrationFee(),
                c.getAccordCount(),
                c.getBalance(),
            ]);
            setContractInfo({
                owner,
                registrationFee: ethers.formatEther(regFee),
                unregistrationFee: ethers.formatEther(unregFee),
                accordCount: Number(count),
                balance: ethers.formatEther(balance),
            });
            setResult({ success: true, message: 'Connected successfully!' });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const registerAccord = async (ipfsHash) => {
        if (!contract || !contractInfo)
            return;
        setLoading(true);
        try {
            const tx = await contract.registerAccord(ipfsHash, {
                value: ethers.parseEther(contractInfo.registrationFee),
            });
            const receipt = await tx.wait();
            const event = receipt.logs.find((log) => {
                try {
                    return contract.interface.parseLog(log)?.name === 'AccordRegistered';
                }
                catch {
                    return false;
                }
            });
            let accordId = 'unknown';
            if (event) {
                const parsed = contract.interface.parseLog(event);
                accordId = parsed?.args[0];
            }
            setResult({
                success: true,
                accordId,
                ipfsHash,
                txHash: receipt.hash,
            });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const listAccords = async () => {
        if (!contract)
            return;
        setLoading(true);
        try {
            const accordIds = await contract.getAllAccords();
            const activeIds = await contract.getActiveAccords();
            const accords = await Promise.all(accordIds.slice(0, 10).map(async (id) => {
                const accord = await contract.getAccord(id);
                return {
                    id,
                    owner: accord.owner,
                    ipfsHash: accord.ipfsHash,
                    createdAt: new Date(Number(accord.createdAt) * 1000).toLocaleString(),
                    active: accord.active,
                };
            }));
            setResult({
                total: accordIds.length,
                active: activeIds.length,
                accords,
            });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const getAccordDetails = async (accordId) => {
        if (!contract)
            return;
        setLoading(true);
        try {
            const accord = await contract.getAccord(accordId);
            setResult({
                accordId,
                owner: accord.owner,
                ipfsHash: accord.ipfsHash,
                createdAt: new Date(Number(accord.createdAt) * 1000).toLocaleString(),
                active: accord.active,
            });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const updateMetadata = async (accordId, newIpfsHash) => {
        if (!contract)
            return;
        setLoading(true);
        try {
            const tx = await contract.updateMetadata(accordId, newIpfsHash);
            const receipt = await tx.wait();
            setResult({
                success: true,
                message: 'Metadata updated!',
                txHash: receipt.hash,
            });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const unregisterAccord = async (accordId) => {
        if (!contract || !contractInfo)
            return;
        setLoading(true);
        try {
            const tx = await contract.unregisterAccord(accordId, {
                value: ethers.parseEther(contractInfo.unregistrationFee),
            });
            const receipt = await tx.wait();
            setResult({
                success: true,
                message: 'Accord unregistered!',
                txHash: receipt.hash,
            });
            setScreen('result');
        }
        catch (err) {
            setError(err.message);
            setScreen('result');
        }
        finally {
            setLoading(false);
        }
    };
    const handleInput = (value) => {
        setInputValue(value);
    };
    const handleSubmit = async () => {
        if (!inputValue.trim())
            return;
        switch (screen) {
            case 'connect':
                await connectToContract(inputValue);
                break;
            case 'register':
                await registerAccord(inputValue);
                break;
            case 'getAccord':
                await getAccordDetails(inputValue);
                break;
            case 'update':
                if (inputMode === 'accordId') {
                    setInputMode('newIpfsHash');
                    setInputValue('');
                }
                else {
                    setError('Update feature requires 2-step input (simplified for demo)');
                    setScreen('menu');
                }
                break;
            case 'unregister':
                await unregisterAccord(inputValue);
                break;
        }
        setInputValue('');
    };
    if (loading || screen === 'deploying') {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { marginY: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" }),
                    " Loading...")),
            React.createElement(Footer, null)));
    }
    if (screen === 'result') {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { flexDirection: "column", marginY: 1, borderStyle: "round", borderColor: "green", padding: 1 }, error ? (React.createElement(React.Fragment, null,
                React.createElement(Text, { color: "red", bold: true }, "\u274C Error:"),
                React.createElement(Text, { color: "red" }, error))) : (React.createElement(React.Fragment, null,
                React.createElement(Text, { color: "green", bold: true }, "\u2705 Success!"),
                result && (React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                    React.createElement(Text, null, JSON.stringify(result, null, 2))))))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "Press Enter to continue...")),
            React.createElement(TextInput, { value: "", onChange: () => { }, onSubmit: () => {
                    setScreen('menu');
                    setError('');
                    setResult(null);
                } }),
            React.createElement(Footer, null)));
    }
    if (screen === 'info' && contractInfo) {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { flexDirection: "column", marginY: 1, borderStyle: "round", borderColor: "cyan", padding: 1 },
                React.createElement(Text, { bold: true, color: "cyan" }, "\uD83D\uDCCA Contract Information"),
                React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                    React.createElement(Text, null,
                        "Address: ",
                        React.createElement(Text, { color: "yellow" }, contractAddress)),
                    React.createElement(Text, null,
                        "Owner: ",
                        React.createElement(Text, { color: "yellow" }, contractInfo.owner)),
                    React.createElement(Text, null,
                        "Registration Fee: ",
                        React.createElement(Text, { color: "green" },
                            contractInfo.registrationFee,
                            " ETH")),
                    React.createElement(Text, null,
                        "Unregistration Fee: ",
                        React.createElement(Text, { color: "green" },
                            contractInfo.unregistrationFee,
                            " ETH")),
                    React.createElement(Text, null,
                        "Total Accords: ",
                        React.createElement(Text, { color: "cyan" }, contractInfo.accordCount)),
                    React.createElement(Text, null,
                        "Contract Balance: ",
                        React.createElement(Text, { color: "green" },
                            contractInfo.balance,
                            " ETH")))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "Press Enter to go back...")),
            React.createElement(TextInput, { value: "", onChange: () => { }, onSubmit: () => setScreen('menu') }),
            React.createElement(Footer, null)));
    }
    if (screen === 'list') {
        listAccords();
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { marginY: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" }),
                    " Fetching accords...")),
            React.createElement(Footer, null)));
    }
    if (['connect', 'register', 'getAccord', 'unregister'].includes(screen)) {
        const prompts = {
            connect: 'Enter contract address:',
            register: 'Enter IPFS hash for metadata:',
            getAccord: 'Enter Accord ID:',
            unregister: 'Enter Accord ID to unregister:',
        };
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { flexDirection: "column", marginY: 1 },
                React.createElement(Text, { bold: true, color: "cyan" }, prompts[screen]),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray" }, "> "),
                    React.createElement(TextInput, { value: inputValue, onChange: handleInput, onSubmit: handleSubmit }))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Ctrl+C to cancel")),
            React.createElement(Footer, null)));
    }
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Header, null),
        !provider && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "round", borderColor: "red" },
            React.createElement(Text, { color: "red" }, "\u26A0\uFE0F  Not connected to Hardhat node!"))),
        provider && !contract && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "round", borderColor: "yellow" },
            React.createElement(Text, { color: "yellow" }, "\uD83D\uDCA1 Deploy or connect to a contract to get started"))),
        contract && contractInfo && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "single", borderColor: "green" },
            React.createElement(Text, { color: "green" },
                "\u2705 Connected to: ",
                contractAddress.slice(0, 10),
                "..."),
            React.createElement(Text, { color: "gray" },
                " | Accords: ",
                contractInfo.accordCount))),
        React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Text, { bold: true, color: "cyan", marginBottom: 1 }, "Select an action:"),
            React.createElement(SelectInput, { items: menuItems, onSelect: handleMenuSelect })),
        React.createElement(Footer, null)));
};
render(React.createElement(BlockchainTest, null));
//# sourceMappingURL=blockchain.js.map