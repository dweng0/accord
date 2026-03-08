import React from 'react';
import { Box, Text } from 'ink';

const Footer: React.FC = () => {
  return (
    <Box marginTop={1} paddingTop={1} borderStyle="single" borderColor="gray">
      <Text color="gray" dimColor>
        Use ↑↓ arrows to navigate • Enter to select • Ctrl+C to exit
      </Text>
    </Box>
  );
};

export default Footer;
