#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { MetadataUploader, MetadataFetcher, createMetadata, } from '@accord/core';
import * as dotenv from 'dotenv';
import path from 'path';
import Header from '../components/Header';
import Footer from '../components/Footer';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
const IPFSTest = () => {
    const [screen, setScreen] = useState('menu');
    const [uploader, setUploader] = useState(null);
    const [fetcher, setFetcher] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [authenticated, setAuthenticated] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState('name');
    const [metadataForm, setMetadataForm] = useState({
        name: '',
        description: '',
        category: 'general',
    });
    useEffect(() => {
        const apiKey = process.env.PINATA_API_KEY;
        const secretKey = process.env.PINATA_SECRET_KEY;
        if (!apiKey || !secretKey) {
            setError('PINATA_API_KEY and PINATA_SECRET_KEY must be set in .env');
            setAuthenticated(false);
            return;
        }
        try {
            const u = new MetadataUploader({
                apiKey,
                secretApiKey: secretKey,
            });
            setUploader(u);
            const f = new MetadataFetcher();
            setFetcher(f);
            u.testAuthentication().then((auth) => {
                setAuthenticated(auth);
                if (!auth) {
                    setError('Pinata authentication failed. Check your API keys.');
                }
            });
        }
        catch (err) {
            setError(`Failed to initialize: ${err.message}`);
            setAuthenticated(false);
        }
    }, []);
    const menuItems = [
        { label: '🔐 Test Pinata Authentication', value: 'testAuth' },
        { label: '📝 Create Metadata', value: 'createMetadata' },
        { label: '⬆️  Upload Metadata to IPFS', value: 'uploadMetadata' },
        { label: '⬇️  Fetch Metadata from IPFS', value: 'fetchMetadata' },
        { label: '🖼️  Upload Image', value: 'uploadImage' },
        { label: '📋 List Pinned Files', value: 'listPinned' },
        { label: '⬅️  Back to Main Menu', value: 'exit' },
    ];
    const handleMenuSelect = (item) => {
        if (item.value === 'exit') {
            process.exit(0);
        }
        setError('');
        setResult(null);
        if (item.value === 'testAuth') {
            testAuthentication();
        }
        else if (item.value === 'createMetadata') {
            setScreen('input');
            setInputMode('name');
        }
        else if (item.value === 'uploadMetadata') {
            if (metadataForm.name) {
                uploadMetadata();
            }
            else {
                setError('Please create metadata first!');
                setScreen('result');
            }
        }
        else if (item.value === 'fetchMetadata') {
            setScreen('input');
            setInputMode('ipfsHash');
        }
        else if (item.value === 'uploadImage') {
            setScreen('input');
            setInputMode('filePath');
        }
        else if (item.value === 'listPinned') {
            listPinned();
        }
        else {
            setScreen(item.value);
        }
    };
    const testAuthentication = async () => {
        if (!uploader) {
            setError('Uploader not initialized');
            setScreen('result');
            return;
        }
        setScreen('loading');
        setLoading(true);
        try {
            const auth = await uploader.testAuthentication();
            setResult({
                authenticated: auth,
                message: auth
                    ? '✅ Pinata authentication successful!'
                    : '❌ Authentication failed',
            });
            setAuthenticated(auth);
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
    const uploadMetadata = async () => {
        if (!uploader) {
            setError('Uploader not initialized');
            setScreen('result');
            return;
        }
        setScreen('loading');
        setLoading(true);
        try {
            const metadata = createMetadata(metadataForm.name, metadataForm.description, {
                category: metadataForm.category,
                rules: ['Be respectful', 'No spam', 'No NSFW content'],
            });
            const ipfsHash = await uploader.uploadMetadata(metadata);
            setResult({
                success: true,
                ipfsHash,
                gateway: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                metadata,
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
    const fetchMetadata = async (ipfsHash) => {
        if (!fetcher) {
            setError('Fetcher not initialized');
            setScreen('result');
            return;
        }
        setScreen('loading');
        setLoading(true);
        try {
            const metadata = await fetcher.fetchMetadata(ipfsHash);
            setResult({
                success: true,
                ipfsHash,
                metadata,
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
    const uploadImage = async (filePath) => {
        if (!uploader) {
            setError('Uploader not initialized');
            setScreen('result');
            return;
        }
        setScreen('loading');
        setLoading(true);
        try {
            const ipfsUrl = await uploader.uploadImage(filePath);
            setResult({
                success: true,
                filePath,
                ipfsUrl,
                gateway: `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}`,
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
    const listPinned = async () => {
        if (!uploader) {
            setError('Uploader not initialized');
            setScreen('result');
            return;
        }
        setScreen('loading');
        setLoading(true);
        try {
            const pinned = await uploader.listPinned();
            setResult({
                success: true,
                count: pinned.length,
                files: pinned.slice(0, 10).map((p) => ({
                    hash: p.ipfs_pin_hash,
                    name: p.metadata?.name || 'unnamed',
                    size: p.size,
                    date: new Date(p.date_pinned).toLocaleString(),
                })),
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
        if (inputMode === 'name') {
            setMetadataForm({ ...metadataForm, name: inputValue });
            setInputValue('');
            setInputMode('description');
        }
        else if (inputMode === 'description') {
            setMetadataForm({ ...metadataForm, description: inputValue });
            setInputValue('');
            setInputMode('category');
        }
        else if (inputMode === 'category') {
            setMetadataForm({ ...metadataForm, category: inputValue });
            setInputValue('');
            setResult({
                message: 'Metadata created! Now upload it to IPFS.',
                metadata: {
                    ...metadataForm,
                    category: inputValue,
                },
            });
            setScreen('result');
        }
        else if (inputMode === 'ipfsHash') {
            await fetchMetadata(inputValue);
            setInputValue('');
        }
        else if (inputMode === 'filePath') {
            await uploadImage(inputValue);
            setInputValue('');
        }
    };
    if (loading || screen === 'loading') {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { marginY: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" }),
                    " Processing...")),
            React.createElement(Footer, null)));
    }
    if (screen === 'result') {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { flexDirection: "column", marginY: 1, borderStyle: "round", borderColor: error ? 'red' : 'green', padding: 1 }, error ? (React.createElement(React.Fragment, null,
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
    if (screen === 'input') {
        const prompts = {
            name: 'Enter Accord name:',
            description: 'Enter description:',
            category: 'Enter category (general/gaming/tech/etc):',
            ipfsHash: 'Enter IPFS hash to fetch:',
            filePath: 'Enter file path to upload:',
        };
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { flexDirection: "column", marginY: 1 },
                React.createElement(Text, { bold: true, color: "cyan" }, prompts[inputMode]),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray" }, "> "),
                    React.createElement(TextInput, { value: inputValue, onChange: handleInput, onSubmit: handleSubmit }))),
            inputMode !== 'ipfsHash' && inputMode !== 'filePath' && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true },
                    "Step ",
                    inputMode === 'name' ? '1' : inputMode === 'description' ? '2' : '3',
                    " of 3"))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Ctrl+C to cancel")),
            React.createElement(Footer, null)));
    }
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Header, null),
        authenticated === false && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "round", borderColor: "red" },
            React.createElement(Text, { color: "red" }, "\u26A0\uFE0F  Not authenticated with Pinata!"))),
        authenticated === true && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "single", borderColor: "green" },
            React.createElement(Text, { color: "green" }, "\u2705 Pinata authenticated"))),
        error && !authenticated && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "round", borderColor: "yellow" },
            React.createElement(Text, { color: "yellow" }, "\uD83D\uDCA1 Run: cp .env.example .env"),
            React.createElement(Text, { color: "yellow" }, "Then add your Pinata API keys"))),
        metadataForm.name && (React.createElement(Box, { marginY: 1, padding: 1, borderStyle: "single", borderColor: "cyan" },
            React.createElement(Text, { color: "cyan" },
                "\uD83D\uDCDD Draft Metadata: ",
                metadataForm.name))),
        React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Text, { bold: true, color: "cyan", marginBottom: 1 }, "Select an action:"),
            React.createElement(SelectInput, { items: menuItems, onSelect: handleMenuSelect })),
        React.createElement(Footer, null)));
};
render(React.createElement(IPFSTest, null));
//# sourceMappingURL=ipfs.js.map