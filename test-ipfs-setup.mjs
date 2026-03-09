import * as dotenv from 'dotenv';
import { MetadataUploader, createMetadata } from './packages/core/src/index.js';

dotenv.config();

const { PINATA_API_KEY, PINATA_SECRET_KEY } = process.env;

console.log('🚀 Testing Accord IPFS + Blockchain Setup\n');
console.log('═'.repeat(50));

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  console.error('❌ Error: PINATA_API_KEY and PINATA_SECRET_KEY must be set in .env');
  process.exit(1);
}

const uploader = new MetadataUploader({
  apiKey: PINATA_API_KEY,
  secretApiKey: PINATA_SECRET_KEY,
});

async function testSetup() {
  try {
    // Test 1: Pinata Authentication
    console.log('\n1️⃣  Testing Pinata Authentication...');
    const auth = await uploader.testAuthentication();
    if (auth) {
      console.log('✅ Pinata authentication successful!');
    } else {
      console.error('❌ Pinata authentication failed');
      process.exit(1);
    }

    // Test 2: Create and upload metadata
    console.log('\n2️⃣  Creating and uploading Accord metadata...');
    const metadata = createMetadata('Test Accord', 'A test community', {
      category: 'testing',
      rules: ['Be respectful', 'No spam'],
    });

    const ipfsHash = await uploader.uploadMetadata(metadata);
    console.log(`✅ Metadata uploaded to IPFS!`);
    console.log(`   IPFS Hash: ${ipfsHash}`);
    console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${ipfsHash}`);

    // Test 3: List pinned files
    console.log('\n3️⃣  Listing pinned files...');
    const pinned = await uploader.listPinned();
    console.log(`✅ Found ${pinned.length} pinned files`);
    if (pinned.length > 0) {
      console.log(`   Latest: ${pinned[0].metadata?.name || 'unnamed'}`);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ All tests passed! Your local setup is ready.');
    console.log('\n📋 Next steps:');
    console.log('  1. Smart contract deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3');
    console.log('  2. IPFS metadata can be uploaded to Pinata');
    console.log('  3. Run: npm run test:blockchain');
    console.log('  4. Run: npm run test:dht');
    console.log('  5. Run: npm run test:webrtc\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSetup();
