import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { kadDHT } from '@libp2p/kad-dht';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
export class Libp2pNode {
    node = null;
    config;
    constructor(config = {}) {
        this.config = {
            enableDHT: true,
            enablePubSub: true,
            ...config,
        };
    }
    async start() {
        try {
            console.log('🚀 Initializing libp2p node...');
            this.node = await createLibp2p({
                addresses: {
                    listen: [
                        '/ip4/0.0.0.0/tcp/0/ws',
                    ],
                    announce: this.config.announceAddresses || [],
                },
                transports: [
                    webSockets(),
                ],
                connectionEncryption: [
                    noise(),
                ],
                streamMuxers: [
                    mplex(),
                ],
                services: {
                    identify: identify(),
                    ...(this.config.enableDHT && {
                        dht: kadDHT({
                            clientMode: false,
                        }),
                    }),
                    ...(this.config.enablePubSub && {
                        pubsub: gossipsub({
                            emitSelf: false,
                            allowPublishToZeroPeers: true,
                        }),
                    }),
                    ...(this.config.bootstrapNodes && this.config.bootstrapNodes.length > 0 && {
                        bootstrap: bootstrap({
                            list: this.config.bootstrapNodes,
                        }),
                    }),
                },
            });
            await this.node.start();
            console.log('✅ libp2p node started');
            console.log('   Peer ID:', this.node.peerId.toString());
            console.log('   Addresses:', this.node.getMultiaddrs().map(ma => ma.toString()));
            this.setupEventListeners();
        }
        catch (error) {
            throw new Error(`Failed to start libp2p node: ${error.message}`);
        }
    }
    async stop() {
        if (!this.node) {
            return;
        }
        try {
            await this.node.stop();
            console.log('🛑 libp2p node stopped');
            this.node = null;
        }
        catch (error) {
            throw new Error(`Failed to stop libp2p node: ${error.message}`);
        }
    }
    getNode() {
        if (!this.node) {
            throw new Error('Node not started. Call start() first.');
        }
        return this.node;
    }
    getPeerId() {
        if (!this.node) {
            throw new Error('Node not started');
        }
        return this.node.peerId;
    }
    getMultiaddrs() {
        if (!this.node) {
            return [];
        }
        return this.node.getMultiaddrs().map(ma => ma.toString());
    }
    getConnectedPeers() {
        if (!this.node) {
            return [];
        }
        return this.node.getPeers().map(peer => peer.toString());
    }
    getPeerCount() {
        if (!this.node) {
            return 0;
        }
        return this.node.getPeers().length;
    }
    async dialPeer(multiaddr) {
        if (!this.node) {
            throw new Error('Node not started');
        }
        try {
            await this.node.dial(multiaddr);
            console.log(`📞 Dialed peer: ${multiaddr}`);
        }
        catch (error) {
            throw new Error(`Failed to dial peer: ${error.message}`);
        }
    }
    isStarted() {
        return this.node !== null;
    }
    setupEventListeners() {
        if (!this.node)
            return;
        this.node.addEventListener('peer:connect', (evt) => {
            const peerId = evt.detail.toString();
            console.log(`🤝 Peer connected: ${peerId}`);
        });
        this.node.addEventListener('peer:disconnect', (evt) => {
            const peerId = evt.detail.toString();
            console.log(`👋 Peer disconnected: ${peerId}`);
        });
        this.node.addEventListener('peer:discovery', (evt) => {
            const peerInfo = evt.detail;
            console.log(`🔍 Peer discovered: ${peerInfo.id.toString()}`);
        });
    }
    getStatus() {
        if (!this.node) {
            return {
                started: false,
                peerId: null,
                peerCount: 0,
                addresses: [],
            };
        }
        return {
            started: true,
            peerId: this.node.peerId.toString(),
            peerCount: this.getPeerCount(),
            addresses: this.getMultiaddrs(),
        };
    }
}
export const DEFAULT_BOOTSTRAP_NODES = [
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
];
export async function createBasicLibp2pNode(config = {}) {
    const node = new Libp2pNode({
        bootstrapNodes: DEFAULT_BOOTSTRAP_NODES,
        ...config,
    });
    await node.start();
    return node;
}
//# sourceMappingURL=libp2p-node.js.map