#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { ethers } from 'ethers';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Import contract artifacts (will be generated after compilation)
// For now, we'll use a simplified ABI
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

interface MenuItem {
  label: string;
  value: string;
}

type Screen =
  | 'menu'
  | 'deploy'
  | 'connect'
  | 'info'
  | 'register'
  | 'list'
  | 'getAccord'
  | 'update'
  | 'unregister'
  | 'deploying'
  | 'loading'
  | 'result';

interface Accord {
  owner: string;
  ipfsHash: string;
  createdAt: bigint;
  active: boolean;
}

const BlockchainTest: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Wallet | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<'address' | 'ipfsHash' | 'accordId' | 'newIpfsHash'>('address');

  // Contract info
  const [contractInfo, setContractInfo] = useState<{
    owner: string;
    registrationFee: string;
    unregistrationFee: string;
    accordCount: number;
    balance: string;
  } | null>(null);

  useEffect(() => {
    // Initialize provider with local Hardhat node
    const initProvider = async () => {
      try {
        const p = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        setProvider(p);

        // Use hardhat account #0
        const s = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
          p
        );
        setSigner(s);
      } catch (err) {
        setError('Failed to connect to Hardhat node. Make sure it\'s running!');
      }
    };

    initProvider();
  }, []);

  const menuItems: MenuItem[] = [
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

  const handleMenuSelect = (item: MenuItem) => {
    if (item.value === 'exit') {
      process.exit(0);
    }
    setScreen(item.value as Screen);
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
      const factory = new ethers.ContractFactory(
        ACCORD_REGISTRY_ABI,
        // This would normally come from artifacts, but for testing we'll need to compile first
        '0x', // Placeholder bytecode
        signer
      );

      // For now, we'll just simulate
      setError('To deploy, run: cd packages/contracts && npx hardhat run scripts/deploy.js --network localhost');
      setScreen('result');
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const connectToContract = async (address: string) => {
    if (!signer) {
      setError('No signer available');
      return;
    }

    setLoading(true);

    try {
      const c = new ethers.Contract(address, ACCORD_REGISTRY_ABI, signer);
      setContract(c);
      setContractAddress(address);

      // Fetch contract info
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const registerAccord = async (ipfsHash: string) => {
    if (!contract || !contractInfo) return;

    setLoading(true);

    try {
      const tx = await contract.registerAccord(ipfsHash, {
        value: ethers.parseEther(contractInfo.registrationFee),
      });

      const receipt = await tx.wait();

      // Extract accordId from event
      const event = receipt.logs.find((log: any) => {
        try {
          return contract.interface.parseLog(log)?.name === 'AccordRegistered';
        } catch {
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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const listAccords = async () => {
    if (!contract) return;

    setLoading(true);

    try {
      const accordIds = await contract.getAllAccords();
      const activeIds = await contract.getActiveAccords();

      const accords = await Promise.all(
        accordIds.slice(0, 10).map(async (id: string) => {
          const accord = await contract.getAccord(id);
          return {
            id,
            owner: accord.owner,
            ipfsHash: accord.ipfsHash,
            createdAt: new Date(Number(accord.createdAt) * 1000).toLocaleString(),
            active: accord.active,
          };
        })
      );

      setResult({
        total: accordIds.length,
        active: activeIds.length,
        accords,
      });
      setScreen('result');
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const getAccordDetails = async (accordId: string) => {
    if (!contract) return;

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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const updateMetadata = async (accordId: string, newIpfsHash: string) => {
    if (!contract) return;

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
    } catch (err: any) {
      setError(err.message);
      setScreen('result');
    } finally {
      setLoading(false);
    }
  };

  const unregisterAccord = async (accordId: string) => {
    if (!contract || !contractInfo) return;

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
        } else {
          // We need both accordId and newIpfsHash
          // For simplicity, we'll prompt for them sequentially
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

  // Render different screens
  if (loading || screen === 'deploying') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Loading...
          </Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  if (screen === 'result') {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="green" padding={1}>
          {error ? (
            <>
              <Text color="red" bold>❌ Error:</Text>
              <Text color="red">{error}</Text>
            </>
          ) : (
            <>
              <Text color="green" bold>✅ Success!</Text>
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

  if (screen === 'info' && contractInfo) {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="cyan" padding={1}>
          <Text bold color="cyan">📊 Contract Information</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Address: <Text color="yellow">{contractAddress}</Text></Text>
            <Text>Owner: <Text color="yellow">{contractInfo.owner}</Text></Text>
            <Text>Registration Fee: <Text color="green">{contractInfo.registrationFee} ETH</Text></Text>
            <Text>Unregistration Fee: <Text color="green">{contractInfo.unregistrationFee} ETH</Text></Text>
            <Text>Total Accords: <Text color="cyan">{contractInfo.accordCount}</Text></Text>
            <Text>Contract Balance: <Text color="green">{contractInfo.balance} ETH</Text></Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to go back...</Text>
        </Box>
        <TextInput
          value=""
          onChange={() => {}}
          onSubmit={() => setScreen('menu')}
        />
        <Footer />
      </Box>
    );
  }

  if (screen === 'list') {
    listAccords();
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box marginY={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Fetching accords...
          </Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  if (['connect', 'register', 'getAccord', 'unregister'].includes(screen)) {
    const prompts = {
      connect: 'Enter contract address:',
      register: 'Enter IPFS hash for metadata:',
      getAccord: 'Enter Accord ID:',
      unregister: 'Enter Accord ID to unregister:',
    };

    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Box flexDirection="column" marginY={1}>
          <Text bold color="cyan">{prompts[screen as keyof typeof prompts]}</Text>
          <Box marginTop={1}>
            <Text color="gray">&gt; </Text>
            <TextInput
              value={inputValue}
              onChange={handleInput}
              onSubmit={handleSubmit}
            />
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="gray" dimColor>Press Ctrl+C to cancel</Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  // Default: menu
  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      {!provider && (
        <Box marginY={1} padding={1} borderStyle="round" borderColor="red">
          <Text color="red">⚠️  Not connected to Hardhat node!</Text>
        </Box>
      )}

      {provider && !contract && (
        <Box marginY={1} padding={1} borderStyle="round" borderColor="yellow">
          <Text color="yellow">💡 Deploy or connect to a contract to get started</Text>
        </Box>
      )}

      {contract && contractInfo && (
        <Box marginY={1} padding={1} borderStyle="single" borderColor="green">
          <Text color="green">✅ Connected to: {contractAddress.slice(0, 10)}...</Text>
          <Text color="gray"> | Accords: {contractInfo.accordCount}</Text>
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
render(<BlockchainTest />);
