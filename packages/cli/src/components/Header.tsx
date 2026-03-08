import React from 'react';
import { Box, Text } from 'ink';

const Header: React.FC = () => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box justifyContent="center">
        <Text bold color="cyan">
          ╔═══════════════════════════════════════════╗
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text bold color="cyan">
          ║           ACCORD - TEST CLI               ║
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text bold color="cyan">
          ║   Decentralized Chat Testing Suite       ║
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text bold color="cyan">
          ╚═══════════════════════════════════════════╝
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text color="gray">Blockchain + IPFS + DHT + WebRTC</Text>
      </Box>
    </Box>
  );
};

export default Header;
