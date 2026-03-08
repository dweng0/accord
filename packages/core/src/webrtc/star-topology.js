import { HostElection } from './host-election';
import { PeerConnectionManager } from './peer-connection';
export class StarTopology {
    libp2p;
    discovery;
    messaging;
    hostElection;
    connectionManager;
    config;
    accordId = '';
    state;
    messageCount = 0;
    onMessageHandlers = [];
    onHostChangeHandlers = [];
    onPeerJoinHandlers = [];
    onPeerLeaveHandlers = [];
    constructor(libp2pInstance, discovery, messaging, config = {}) {
        this.libp2p = libp2pInstance;
        this.discovery = discovery;
        this.messaging = messaging;
        this.config = {
            electionTimeout: 5000,
            maxPeers: 50,
            ...config,
        };
        this.hostElection = new HostElection(this.libp2p, {
            electionTimeout: this.config.electionTimeout,
        });
        this.connectionManager = new PeerConnectionManager(this.libp2p, messaging, {
            maxPeers: this.config.maxPeers,
            iceServers: this.config.iceServers,
        });
        this.state = {
            accordId: '',
            role: 'none',
            hostInfo: null,
            connectedPeers: [],
            discoveredPeers: [],
            messageCount: 0,
        };
        this.setupEventHandlers();
    }
    async joinAccord(accordId) {
        this.accordId = accordId;
        this.state.accordId = accordId;
        console.log(`🚀 Joining Accord with star topology: ${accordId}`);
        await this.discovery.announceAccord(accordId);
        await this.messaging.subscribe(accordId, (_message, _from) => {
        });
        await this.sleep(2000);
        const peers = await this.discovery.findPeers(accordId);
        const peerIds = peers.map((p) => p.peerId);
        this.state.discoveredPeers = peerIds;
        console.log(`Found ${peerIds.length} peer(s)`);
        const hostInfo = await this.hostElection.electHost(peerIds);
        this.state.hostInfo = hostInfo;
        this.onHostChangeHandlers.forEach((handler) => handler(hostInfo));
        if (this.hostElection.isCurrentHost()) {
            this.state.role = 'host';
            await this.connectionManager.initializeAsHost(accordId);
            console.log('🌟 Initialized as HOST');
        }
        else {
            this.state.role = 'peer';
            await this.connectionManager.initializeAsPeer(accordId, hostInfo.peerId);
            console.log(`👤 Initialized as PEER, connecting to host: ${hostInfo.peerId}`);
        }
        console.log('✅ Successfully joined Accord');
    }
    async leaveAccord() {
        console.log(`👋 Leaving Accord: ${this.accordId}`);
        this.connectionManager.disconnectAll();
        await this.messaging.unsubscribe(this.accordId);
        this.state = {
            accordId: '',
            role: 'none',
            hostInfo: null,
            connectedPeers: [],
            discoveredPeers: [],
            messageCount: 0,
        };
        this.accordId = '';
        console.log('✅ Left Accord');
    }
    sendMessage(text, from) {
        this.connectionManager.sendChatMessage(text, from);
    }
    async handleHostMigration() {
        console.log('⚠️  Host disconnected, initiating migration...');
        const remainingPeers = this.discovery.getDiscoveredPeers().map((p) => p.peerId);
        this.connectionManager.disconnectAll();
        const newHostInfo = await this.hostElection.reelectHost(remainingPeers);
        this.state.hostInfo = newHostInfo;
        this.onHostChangeHandlers.forEach((handler) => handler(newHostInfo));
        if (this.hostElection.isCurrentHost()) {
            this.state.role = 'host';
            await this.connectionManager.initializeAsHost(this.accordId);
            console.log('🌟 Became new HOST after migration');
        }
        else {
            this.state.role = 'peer';
            await this.connectionManager.initializeAsPeer(this.accordId, newHostInfo.peerId);
            console.log(`👤 Reconnecting to new host: ${newHostInfo.peerId}`);
        }
    }
    setupEventHandlers() {
        this.connectionManager.onMessage((message) => {
            this.messageCount++;
            this.state.messageCount = this.messageCount;
            this.onMessageHandlers.forEach((handler) => handler(message));
        });
        this.connectionManager.onPeerConnected((peerId) => {
            this.state.connectedPeers = this.connectionManager.getConnectedPeers();
            this.onPeerJoinHandlers.forEach((handler) => handler(peerId));
        });
        this.connectionManager.onPeerDisconnected((peerId) => {
            this.state.connectedPeers = this.connectionManager.getConnectedPeers();
            this.onPeerLeaveHandlers.forEach((handler) => handler(peerId));
            if (this.state.hostInfo && peerId === this.state.hostInfo.peerId) {
                this.handleHostMigration();
            }
        });
    }
    onMessage(handler) {
        this.onMessageHandlers.push(handler);
    }
    onHostChange(handler) {
        this.onHostChangeHandlers.push(handler);
    }
    onPeerJoin(handler) {
        this.onPeerJoinHandlers.push(handler);
    }
    onPeerLeave(handler) {
        this.onPeerLeaveHandlers.push(handler);
    }
    getState() {
        return {
            ...this.state,
            connectedPeers: this.connectionManager.getConnectedPeers(),
        };
    }
    getStatus() {
        return {
            topology: this.getState(),
            host: this.hostElection.getStatus(),
            connections: this.connectionManager.getStatus(),
        };
    }
    isHost() {
        return this.state.role === 'host';
    }
    getHost() {
        return this.state.hostInfo;
    }
    async triggerReelection() {
        await this.handleHostMigration();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
export async function createStarTopology(libp2p, discovery, messaging, accordId, config) {
    const topology = new StarTopology(libp2p, discovery, messaging, config);
    await topology.joinAccord(accordId);
    return topology;
}
//# sourceMappingURL=star-topology.js.map