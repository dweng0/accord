# IPFS Setup Guide

## Getting Started with Pinata

Pinata is a pinning service that keeps your IPFS content available. It's free for small projects.

### 1. Create a Pinata Account

1. Go to [https://www.pinata.cloud/](https://www.pinata.cloud/)
2. Sign up for a free account
3. Verify your email

### 2. Get API Keys

1. Log in to Pinata
2. Go to **API Keys** in the sidebar
3. Click **New Key**
4. Give it a name (e.g., "Accord Development")
5. Enable permissions:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
   - ✅ `unpin`
   - ✅ `pinList`
6. Click **Create Key**
7. **Important:** Copy your API Key and API Secret immediately (you won't see the secret again!)

### 3. Add Keys to .env

Open `.env` file (or create it from `.env.example`):

```bash
# Copy from .env.example if needed
cp .env.example .env
```

Edit `.env` and add your Pinata keys:

```bash
# IPFS Configuration
PINATA_API_KEY=your_actual_api_key_here
PINATA_SECRET_KEY=your_actual_secret_key_here
```

Example:
```bash
PINATA_API_KEY=abc123def456ghi789
PINATA_SECRET_KEY=jkl012mno345pqr678stu901vwx234
```

### 4. Test Your Connection

```bash
# From project root
npm run test:ipfs
```

You should see:
```
✅ Pinata authenticated successfully!
```

## Free Tier Limits

Pinata Free Tier includes:
- ✅ 1 GB storage
- ✅ Unlimited pins
- ✅ Unlimited bandwidth
- ✅ No credit card required

This is more than enough for development and testing!

## Alternative: Web3.Storage

If you prefer Web3.Storage instead of Pinata:

### 1. Create Account

1. Go to [https://web3.storage/](https://web3.storage/)
2. Sign up with email or GitHub

### 2. Get API Token

1. Go to **Account** → **Create an API token**
2. Copy your token

### 3. Add to .env

```bash
WEB3_STORAGE_TOKEN=your_web3_storage_token_here
```

## IPFS Gateway URLs

Your uploaded content will be accessible via:

**Pinata Gateway:**
```
https://gateway.pinata.cloud/ipfs/{CID}
```

**Public IPFS Gateway:**
```
https://ipfs.io/ipfs/{CID}
```

**Cloudflare Gateway:**
```
https://cloudflare-ipfs.com/ipfs/{CID}
```

## Testing IPFS Uploads

### Upload Metadata

```typescript
import { MetadataUploader, createMetadata } from '@accord/core';

const uploader = new MetadataUploader({
  apiKey: process.env.PINATA_API_KEY!,
  secretApiKey: process.env.PINATA_SECRET_KEY!,
});

const metadata = createMetadata('My Accord', 'A cool community', {
  category: 'gaming',
  rules: ['Be respectful', 'No spam'],
});

const ipfsHash = await uploader.uploadMetadata(metadata);
console.log('IPFS Hash:', ipfsHash);
// Output: QmXyz123...
```

### Upload Images

```typescript
// Upload icon and banner
const images = await uploader.uploadImages(
  './icon.png',
  './banner.jpg'
);

console.log('Icon:', images.icon);     // ipfs://QmAbc...
console.log('Banner:', images.banner); // ipfs://QmDef...
```

### Fetch Metadata

```typescript
import { MetadataFetcher } from '@accord/core';

const fetcher = new MetadataFetcher();
const metadata = await fetcher.fetchMetadata('QmXyz123...');

console.log('Name:', metadata.name);
console.log('Description:', metadata.description);
```

## Troubleshooting

### "Authentication failed"

- Check your API keys are correct
- Make sure there are no extra spaces
- Regenerate keys if needed

### "File not found"

- Ensure file paths are correct
- Use absolute paths or paths relative to project root

### "Rate limit exceeded"

- Free tier has rate limits
- Wait a few minutes and try again
- Consider upgrading if needed

### "Network error"

- Check your internet connection
- Try a different IPFS gateway
- Verify Pinata status: [https://status.pinata.cloud/](https://status.pinata.cloud/)

## Security Best Practices

1. **Never commit .env to git**
   - Already in `.gitignore`
   - Always use environment variables

2. **Rotate API keys regularly**
   - Regenerate every few months
   - Delete old keys

3. **Use read-only keys for public clients**
   - Create separate keys for different environments
   - Limit permissions as needed

4. **Monitor usage**
   - Check Pinata dashboard regularly
   - Set up alerts if available

## Next Steps

1. ✅ Get Pinata API keys
2. ✅ Add to `.env`
3. ✅ Test connection with CLI
4. ✅ Upload test metadata
5. ✅ Integrate with blockchain layer

Happy pinning! 📌
