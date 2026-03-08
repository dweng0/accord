#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {
  MetadataUploader,
  MetadataFetcher,
  createMetadata,
  AccordMetadata,
} from '@accord/core';
import * as dotenv from 'dotenv';
import path from 'path';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

interface MenuItem {
  label: string;
  value: string;
}

type Screen =
  | 'menu'
  | 'testAuth'
  | 'createMetadata'
  | 'uploadMetadata'
  | 'fetchMetadata'
  | 'uploadImage'
  | 'listPinned'
  | 'input'
  | 'result'
  | 'loading';

const IPFSTest: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [uploader, setUploader] = useState<MetadataUploader | null>(null);
  const [fetcher, setFetcher] = useState<MetadataFetcher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<
    'name' | 'description' | 'category' | 'ipfsHash' | 'filePath'
  >('name');
  const [metadataForm, setMetadataForm] = useState({
    name: '',
    description: '',
    category: 'general',
  });

  useEffect(() => {
    // Initialize IPFS services
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

      // Test authentication
      u.testAuthentication().then((auth) => {
        setAuthenticated(auth);
        if (!auth) {
          setError('Pinata authentication failed. Check your API keys.');
        }
      });
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
      setAuthenticated(false);
    }
  }, []);

  const menuItems: MenuItem[] = [
    { label: '🔐 Test Pinata Authentication', value: 'testAuth' },
    { label: '📝 Create Metadata', value: 'createMetadata' },
    { label: '⬆️  Upload Metadata to IPFS', value: 'uploadMetadata' },
    { label: '⬇️  Fetch Metadata from IPFS', value: 'fetchMetadata' },
    { label: '🖼️  Upload Image', value: 'uploadImage' },
    { label: '📋 List Pinned Files', value: 'listPinned' },
    { label: '⬅️  Back to Main Menu', value: 'exit' },
  ];

  const handleMenuSelect = (item: MenuItem) => {
    if (item.value === 'exit') {
      process.exit(0);
    }

    setError('');
    setResult(null);

    if (item.value === 'testAuth') {
      testAuthentication();
    } else if (item.value === 'createMetadata') {
      setScreen('input');
      setInputMode('name');
    } else if (item.value === 'uploadMetadata') {
      if (metadataForm.name) {
        uploadMetadata();
      } else {
        setError('Please create metadata first!');
        setScreen('result');
      }
    } else if (item.value === 'fetchMetadata') {
      setScreen('input');
      setInputMode('ipfsHash');
    } else if (item.value === 'uploadImage') {
      setScreen('input');
      setInputMode('filePath');
    } else if (item.value === 'listPinned') {
      listPinned();
    } else {
      setScreen(item.value as Screen);
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (ipfsHash: string) => {
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (filePath: string) => {
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
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
        files: pinned.slice(0, 10).map((p: any) => ({
          hash: p.ipfs_pin_hash,
          name: p.metadata?.name || 'unnamed',
          size: p.size,
          date: new Date(p.date_pinned).toLocaleString(),
        })),
      });
      setScreen('result');
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (value: string) => {
    setInputValue(value);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    if (inputMode === 'name') {
      setMetadataForm({ ...metadataForm, name: inputValue });
      setInputValue('');
      setInputMode('description');
    } else if (inputMode === 'description') {
      setMetadataForm({ ...metadataForm, description: inputValue });
      setInputValue('');
      setInputMode('category');
    } else if (inputMode === 'category') {
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
    } else if (inputMode === 'ipfsHash') {
      await fetchMetadata(inputValue);
      setInputValue('');
    } else if (inputMode === 'filePath') {
      await uploadImage(inputValue);
      setInputValue('');
    }
  };

  // Render loading screen
  if (loading || screen === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Processing...
          </Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  // Render result screen
  if (screen === 'result') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box
          flexDirection="column"
          marginY={1}
          borderStyle="round"
          borderColor={error ? 'red' : 'green'}
          padding={1}
        >
          {error ? (
            <>
              <Text color="red" bold>
                ❌ Error:
              </Text>
              <Text color="red">{error}</Text>
            </>
          ) : (
            <>
              <Text color="green" bold>
                ✅ Success!
              </Text>
              {result && (
                <Box flexDirection="column" marginTop={1}>
                  <Text>{JSON.stringify(result, null, 2)}</Text>
                </Box>
              )}
            </>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to continue...</Text>
        </Box>
        <TextInput
          value=""
          onChange={() => {}}
          onSubmit={() => {
            setScreen('menu');
            setError('');
            setResult(null);
          }}
        />
        <Footer />
      </Box>
    );
  }

  // Render input screen
  if (screen === 'input') {
    const prompts = {
      name: 'Enter Accord name:',
      description: 'Enter description:',
      category: 'Enter category (general/gaming/tech/etc):',
      ipfsHash: 'Enter IPFS hash to fetch:',
      filePath: 'Enter file path to upload:',
    };

    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box flexDirection="column" marginY={1}>
          <Text bold color="cyan">
            {prompts[inputMode]}
          </Text>
          <Box marginTop={1}>
            <Text color="gray">&gt; </Text>
            <TextInput value={inputValue} onChange={handleInput} onSubmit={handleSubmit} />
          </Box>
        </Box>
        {inputMode !== 'ipfsHash' && inputMode !== 'filePath' && (
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Step {inputMode === 'name' ? '1' : inputMode === 'description' ? '2' : '3'} of 3
            </Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press Ctrl+C to cancel
          </Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  // Render main menu
  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      {authenticated === false && (
        <Box marginY={1} padding={1} borderStyle="round" borderColor="red">
          <Text color="red">⚠️  Not authenticated with Pinata!</Text>
        </Box>
      )}

      {authenticated === true && (
        <Box marginY={1} padding={1} borderStyle="single" borderColor="green">
          <Text color="green">✅ Pinata authenticated</Text>
        </Box>
      )}

      {error && !authenticated && (
        <Box marginY={1} padding={1} borderStyle="round" borderColor="yellow">
          <Text color="yellow">💡 Run: cp .env.example .env</Text>
          <Text color="yellow">Then add your Pinata API keys</Text>
        </Box>
      )}

      {metadataForm.name && (
        <Box marginY={1} padding={1} borderStyle="single" borderColor="cyan">
          <Text color="cyan">📝 Draft Metadata: {metadataForm.name}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginY={1}>
        <Text bold color="cyan" marginBottom={1}>
          Select an action:
        </Text>
        <SelectInput items={menuItems} onSelect={handleMenuSelect} />
      </Box>

      <Footer />
    </Box>
  );
};

// Render the app
render(<IPFSTest />);
