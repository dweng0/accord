#!/bin/bash

echo "Deploying AccordRegistry to local Hardhat node..."
echo "Make sure you have 'npx hardhat node' running in another terminal!"
echo ""

if ! nc -z localhost 8545; then
  echo "❌ Error: Cannot connect to Hardhat node at localhost:8545"
  echo "Please run 'npx hardhat node' in another terminal first"
  exit 1
fi

echo "✅ Connected to Hardhat node"
echo ""

cd packages/contracts && npx hardhat run scripts/deploy.js --network localhost