import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Header from './Header';
import Footer from './Footer';
const App = () => {
    const [selectedTest] = useState(null);
    const items = [
        { label: '🔗 Phase 2: Blockchain Layer', value: 'blockchain' },
        { label: '📦 Phase 3: IPFS Layer', value: 'ipfs' },
        { label: '🌐 Phase 4: DHT Peer Discovery', value: 'dht' },
        { label: '🔌 Phase 5: WebRTC Connections', value: 'webrtc' },
        { label: '🔐 Phase 6: Authentication & Verification', value: 'auth' },
        { label: '🛡️  Phase 7: Moderation System', value: 'moderation' },
        { label: '💬 Phase 8: Full Chat Integration', value: 'full' },
        { label: '❌ Exit', value: 'exit' },
    ];
    const handleSelect = (item) => {
        if (item.value === 'exit') {
            process.exit(0);
        }
        console.clear();
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║              ACCORD TEST CLI - INSTRUCTIONS              ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        console.log(`  Selected: ${item.label}\n`);
        console.log('  To run this test, use one of these commands:\n');
        console.log(`  📌 Direct:    npm run test:${item.value}`);
        console.log(`  📌 Shortcut:  npm run test:${item.value} -w @accord/cli\n`);
        console.log('  Available test commands:');
        console.log('  ─────────────────────────────────────────────────────────');
        console.log('  npm run test:blockchain   - Test blockchain integration');
        console.log('  npm run test:ipfs         - Test IPFS metadata storage');
        console.log('  npm run test:dht          - Test DHT peer discovery');
        console.log('  npm run test:webrtc       - Test WebRTC connections');
        console.log('  npm run test:auth         - Test authentication system');
        console.log('  npm run test:moderation   - Test moderation features');
        console.log('  npm run test:full         - Test full integration\n');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  Press Ctrl+C to exit, then run your test command       ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
    };
    if (selectedTest) {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Header, null),
            React.createElement(Box, { marginY: 1 },
                React.createElement(Text, { color: "yellow" },
                    "Loading test: ",
                    selectedTest,
                    "...")),
            React.createElement(Text, { color: "gray" }, "(Test implementations coming soon)"),
            React.createElement(Footer, null)));
    }
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Header, null),
        React.createElement(Box, { flexDirection: "column", marginY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { bold: true, color: "cyan" }, "Select a test phase to view run instructions:")),
            React.createElement(SelectInput, { items: items, onSelect: handleSelect })),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true }, "\uD83D\uDCA1 Tip: Run tests directly with: npm run test:[name]")),
        React.createElement(Footer, null)));
};
export default App;
//# sourceMappingURL=App.js.map