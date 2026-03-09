#!/bin/bash

# Local Development Orchestration Script for Accord
# This script sets up and runs all components for local development

set -e

echo "🚀 Starting Accord Local Development Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is required but not installed."
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed."
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

if ! command_exists jq; then
    echo "⚠️  jq is recommended but not installed. Installing..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    fi
fi

# Start services in background
echo "🔧 Building packages..."

# Build all packages
npm install
npm run build --workspaces

echo "🌐 Setting up local blockchain (Hardhat Network)..."

# Start Hardhat network in background
npx hardhat node &
HARDHAT_PID=$!

# Wait a moment for Hardhat to start
sleep 3

echo "📦 Deploying contracts to local network..."

# Deploy contracts to local network
npx hardhat run scripts/deploy-local.sh --network localhost || {
    echo "❌ Failed to deploy contracts. Attempting manual deployment..."
    
    # Create a simple deployment script
    cat > /tmp/deploy-local-temp.js << 'EOF'
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const AccordRegistry = await hre.ethers.getContractFactory("AccordRegistry");
  const accordRegistry = await AccordRegistry.deploy();
  await accordRegistry.waitForDeployment();

  console.log("AccordRegistry deployed to:", await accordRegistry.getAddress());

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    address: await accordRegistry.getAddress(),
    abi: AccordRegistry.interface.format(),
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync("./local-deployment.json", JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
EOF

    npx hardhat run /tmp/deploy-local-temp.js --network localhost
    rm /tmp/deploy-local-temp.js
}

echo "💾 Starting IPFS daemon..."

# Start IPFS daemon in background
if command_exists ipfs; then
    ipfs daemon &
    IPFS_PID=$!
    sleep 5  # Wait for IPFS to start
else
    echo "⚠️  IPFS not found. Using browser-based IPFS (Web3.Storage/Pinata) for development."
fi

echo "🔗 Starting libp2p bootstrap nodes..."

# Create temporary bootstrap server
cat > /tmp/bootstrap-server.js << 'EOF'
// Simple bootstrap server for development
const { createLibp2p } = require('@libp2p/libp2p')
const { webSockets } = require('@libp2p/websockets')
const { noise } = require('@chainsafe/libp2p-noise')
const { mplex } = require('@libp2p/mplex')
const { kadDHT } = require('@libp2p/kad-dht')

async function createBootstrapNode() {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0/ws']
    },
    transports: [webSockets()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    services: {
      dht: kadDHT({
        clientMode: false
      })
    }
  })

  await node.start()
  
  console.log('Bootstrap node listening on:')
  node.getMultiaddrs().forEach(addr => {
    console.log(addr.toString())
  })
  
  return node
}

console.log('Starting bootstrap node...')
createBootstrapNode()
  .then(node => {
    console.log('Bootstrap node ready!')
  })
  .catch(err => {
    console.error('Bootstrap node error:', err)
    process.exit(1)
  })

// Keep process alive
process.stdin.resume()
EOF

node /tmp/bootstrap-server.js &
BOOTSTRAP_PID=$!

sleep 3

echo "🖥️  Starting development web server..."

# Start the web UI in development mode
if [ -d "packages/web" ]; then
    cd packages/web
    npm run dev &
    WEB_PID=$!
    cd ../..
else
    echo "⚠️  Web package not found. Creating basic web package..."

    # Create a basic web package
    mkdir -p packages/web
    cd packages/web
    
    # Initialize new package
    npm init -y
    npm install react react-dom
    npm install --save-dev @types/react @types/react-dom webpack webpack-cli webpack-dev-server typescript ts-loader
    
    # Create basic React app
    mkdir -p src
    cat > src/App.tsx << 'APP_EOF'
import React, { useState, useEffect } from 'react';

interface Accord {
  id: string;
  name: string;
  description: string;
  members: number;
}

const App: React.FC = () => {
  const [accords, setAccords] = useState<Accord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching available accords
    setTimeout(() => {
      setAccords([
        {
          id: 'test-accord-1',
          name: 'Local Development Accord',
          description: 'A test accord running on your local network',
          members: 1
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Accord - Decentralized Chat</h1>
        <p>Running on local network</p>
      </header>
      
      <main>
        <h2>Available Accords</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="accord-list">
            {accords.map(accord => (
              <div key={accord.id} className="accord-card">
                <h3>{accord.name}</h3>
                <p>{accord.description}</p>
                <p>{accord.members} member{accord.members !== 1 ? 's' : ''}</p>
                <button onClick={() => joinAccord(accord.id)}>Join</button>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer>
        <p>Local Development Mode</p>
      </footer>
    </div>
  );
};

const joinAccord = (accordId: string) => {
  alert(`Attempting to join ${accordId} via P2P network...`);
  // In real implementation, this would connect to the P2P network
};

export default App;
APP_EOF

    cat > src/index.tsx << 'INDEX_EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
INDEX_EOF

    cat > src/styles.css << 'CSS_EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.accord-card {
  background: white;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.accord-card button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.accord-card button:hover {
  background: #0056b3;
}
CSS_EOF

    cat > index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accord - Local Development</title>
</head>
<body>
    <div id="root"></div>
    <script src="./src/index.tsx"></script>
</body>
</html>
HTML_EOF

    # Create basic webpack config
    cat > webpack.config.js << 'WEBPACK_EOF'
const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devServer: {
    static: './',
    port: 3000,
    open: true
  }
};
WEBPACK_EOF

    cat > tsconfig.json << 'TS_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "src"
  ]
}
TS_EOF

    # Add scripts to package.json
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      pkg.scripts = {
        ...pkg.scripts,
        'dev': 'webpack serve --mode development',
        'build': 'webpack --mode production'
      };
      pkg.devDependencies = {
        ...(pkg.devDependencies || {}),
        'webpack': '^5.0.0',
        'webpack-cli': '^4.0.0',
        'webpack-dev-server': '^4.0.0',
        'ts-loader': '^9.0.0',
        'typescript': '^4.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        'css-loader': '^6.0.0',
        'style-loader': '^3.0.0'
      };
      pkg.dependencies = {
        ...(pkg.dependencies || {}),
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      };
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    cd ../..
    
    echo "✅ Created basic web package for development"
fi

echo "⚙️  Starting CLI interface..."

# Start CLI in background so it's available for testing
cd packages/cli
npm run build || echo "Building CLI failed, continuing..."
cd ../..

echo "🌐 Development environment ready!"

echo ""
echo "📋 Available Services:"
echo "   - Local Blockchain: http://localhost:8545 (Hardhat)"
echo "   - Web UI: http://localhost:3000"
echo "   - CLI: npm run cli"
echo "   - IPFS: localhost:5001 (if installed)"
echo ""
echo "💡 Quick Start Commands:"
echo "   - Register a new Accord: npx hardhat run scripts/register-accord.js --network localhost"
echo "   - Test CLI: npm run cli"
echo "   - View accounts: npx hardhat console --network localhost"
echo ""

echo "📝 Local deployment info saved to local-deployment.json"

# Set up cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down local development environment..."
    
    if [ ! -z "$WEB_PID" ] && kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID
        echo "   - Stopped web server"
    fi
    
    if [ ! -z "$BOOTSTRAP_PID" ] && kill -0 $BOOTSTRAP_PID 2>/dev/null; then
        kill $BOOTSTRAP_PID
        echo "   - Stopped bootstrap node"
    fi
    
    if [ ! -z "$IPFS_PID" ] && kill -0 $IPFS_PID 2>/dev/null; then
        kill $IPFS_PID
        echo "   - Stopped IPFS daemon"
    fi
    
    if [ ! -z "$HARDHAT_PID" ] && kill -0 $HARDHAT_PID 2>/dev/null; then
        kill $HARDHAT_PID
        echo "   - Stopped Hardhat network"
    fi
    
    # Clean up temp files
    rm -f /tmp/bootstrap-server.js
    
    echo "✅ Cleanup complete!"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Keep the script running
echo "🎯 Local development environment is running!"
echo "Press Ctrl+C to stop all services"
wait