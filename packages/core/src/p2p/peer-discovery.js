export class PeerDiscovery {
    libp2p;
    config;
    discoveredPeers = new Map();
    constructor(libp2p, config = {}) {
        this.libp2p = libp2p;
        this.config = {
            timeout: 30000,
            maxPeers: 50,
            ...config,
        };
    }
    async announceAccord(accordId) {
        try {
            const key = this.createAccordKey(accordId);
            console.log(`📢 Announcing presence in Accord: ${accordId}`);
            const dht = this.libp2p.services.dht;
            if (!dht) {
                throw new Error('DHT not enabled');
            }
            await dht.provide(key);
            console.log(`✅ Announced to DHT for Accord: ${accordId}`);
        }
        catch (error) {
            throw new Error(`Failed to announce Accord: ${error.message}`);
        }
    }
    async findPeers(accordId) {
        try {
            const key = this.createAccordKey(accordId);
            console.log(`🔍 Finding peers for Accord: ${accordId}`);
            const dht = this.libp2p.services.dht;
            if (!dht) {
                throw new Error('DHT not enabled');
            }
            const peers = [];
            const myPeerId = this.libp2p.peerId.toString();
            const providers = await dht.findProviders(key, {
                timeout: this.config.timeout,
            });
            for await (const provider of providers) {
                const peerId = provider.id.toString();
                if (peerId === myPeerId) {
                    continue;
                }
                if (peers.length >= this.config.maxPeers) {
                    break;
                }
                const peerInfo = {
                    peerId,
                    multiaddrs: provider.multiaddrs.map((ma) => ma.toString()),
                    joinedAt: Date.now(),
                };
                peers.push(peerInfo);
                this.discoveredPeers.set(peerId, peerInfo);
                console.log(`   Found peer: ${peerId}`);
            }
            console.log(`✅ Found ${peers.length} peer(s) for Accord: ${accordId}`);
            return peers;
        }
        catch (error) {
            console.error(`Failed to find peers: ${error.message}`);
            return [];
        }
    }
    getDiscoveredPeers() {
        return Array.from(this.discoveredPeers.values());
    }
    getPeer(peerId) {
        return this.discoveredPeers.get(peerId);
    }
    removePeer(peerId) {
        this.discoveredPeers.delete(peerId);
    }
    clearPeers() {
        this.discoveredPeers.clear();
    }
    createAccordKey(accordId) {
        const keyString = `accord:${accordId}`;
        return new TextEncoder().encode(keyString);
    }
    monitorPeers(callback) {
        this.libp2p.addEventListener('peer:connect', (evt) => {
            callback('connect', evt.detail.toString());
        });
        this.libp2p.addEventListener('peer:disconnect', (evt) => {
            callback('disconnect', evt.detail.toString());
        });
    }
    getRoutingTableSize() {
        const dht = this.libp2p.services.dht;
        if (!dht || !dht.routingTable) {
            return 0;
        }
        return dht.routingTable.size || 0;
    }
    getDHTStatus() {
        const dht = this.libp2p.services.dht;
        if (!dht) {
            return {
                enabled: false,
                routingTableSize: 0,
                mode: 'disabled',
            };
        }
        return {
            enabled: true,
            routingTableSize: this.getRoutingTableSize(),
            mode: dht._clientMode ? 'client' : 'server',
        };
    }
}
export async function waitForDHT(libp2p, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const dht = libp2p.services.dht;
        if (dht && dht.isStarted && dht.isStarted()) {
            console.log('✅ DHT is ready');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('DHT not ready within timeout');
}
//# sourceMappingURL=peer-discovery.js.map