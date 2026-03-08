import SimplePeer from 'simple-peer';
export class PeerConnectionManager {
    libp2p;
    messaging;
    config;
    connections = new Map();
    isHost = false;
    accordId = '';
    onMessageHandlers = [];
    onPeerConnectedHandlers = [];
    onPeerDisconnectedHandlers = [];
    constructor(libp2p, messaging, config = {}) {
        this.libp2p = libp2p;
        this.messaging = messaging;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            maxPeers: 50,
            ...config,
        };
    }
    async initializeAsHost(accordId) {
        this.accordId = accordId;
        this.isHost = true;
        console.log('🌟 Initializing as HOST for Accord:', accordId);
        await this.messaging.subscribe(accordId, (message, from) => {
            if (message.type === 'webrtc-signal') {
                this.handleSignal(from, message.signal);
            }
        });
        console.log('✅ Host initialized, listening for peer connections');
    }
    async initializeAsPeer(accordId, hostPeerId) {
        this.accordId = accordId;
        this.isHost = false;
        console.log(`👤 Initializing as PEER, connecting to host: ${hostPeerId}`);
        await this.messaging.subscribe(accordId, (message, from) => {
            if (message.type === 'webrtc-signal' && from === hostPeerId) {
                this.handleSignal(from, message.signal);
            }
        });
        await this.connectToPeer(hostPeerId, true);
        console.log('✅ Peer initialized, attempting to connect to host');
    }
    async connectToPeer(peerId, initiator) {
        if (this.connections.has(peerId)) {
            console.log(`Already connected to ${peerId}`);
            return;
        }
        console.log(`${initiator ? '📞 Initiating' : '📱 Accepting'} connection with ${peerId}`);
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            config: {
                iceServers: this.config.iceServers,
            },
        });
        const connection = {
            peerId,
            peer,
            connected: false,
        };
        this.connections.set(peerId, connection);
        peer.on('signal', (signal) => {
            this.messaging.sendSignal(this.accordId, peerId, signal);
        });
        peer.on('connect', () => {
            console.log(`✅ Connected to ${peerId}`);
            connection.connected = true;
            connection.connectedAt = Date.now();
            this.onPeerConnectedHandlers.forEach((handler) => handler(peerId));
        });
        peer.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleDataMessage(message, peerId);
            }
            catch (error) {
                console.error('Failed to parse message:', error);
            }
        });
        peer.on('error', (err) => {
            console.error(`❌ Connection error with ${peerId}:`, err.message);
        });
        peer.on('close', () => {
            console.log(`👋 Disconnected from ${peerId}`);
            this.connections.delete(peerId);
            this.onPeerDisconnectedHandlers.forEach((handler) => handler(peerId));
        });
    }
    async handleSignal(from, signal) {
        let connection = this.connections.get(from);
        if (!connection) {
            await this.connectToPeer(from, false);
            connection = this.connections.get(from);
        }
        if (connection && connection.peer) {
            try {
                connection.peer.signal(signal);
            }
            catch (error) {
                console.error('Failed to process signal:', error.message);
            }
        }
    }
    handleDataMessage(message, fromPeerId) {
        if (this.isHost && message.type === 'relay' && message.to) {
            this.relayMessage(message, fromPeerId);
            return;
        }
        this.onMessageHandlers.forEach((handler) => handler(message));
    }
    sendToPeer(peerId, message) {
        const connection = this.connections.get(peerId);
        if (!connection || !connection.connected) {
            console.error(`Cannot send to ${peerId}: not connected`);
            return;
        }
        try {
            const data = JSON.stringify(message);
            connection.peer.send(data);
        }
        catch (error) {
            console.error(`Failed to send to ${peerId}:`, error.message);
        }
    }
    broadcast(message, except) {
        this.connections.forEach((connection, peerId) => {
            if (except && peerId === except) {
                return;
            }
            if (connection.connected) {
                this.sendToPeer(peerId, message);
            }
        });
    }
    sendChatMessage(text, from) {
        const myPeerId = this.libp2p.peerId.toString();
        const message = {
            type: 'chat',
            from: myPeerId,
            payload: { text, username: from },
            timestamp: Date.now(),
        };
        if (this.isHost) {
            this.broadcast(message);
            this.onMessageHandlers.forEach((handler) => handler(message));
        }
        else {
            const hostConnection = Array.from(this.connections.values())[0];
            if (hostConnection) {
                const relayMessage = {
                    type: 'relay',
                    from: myPeerId,
                    payload: message,
                    timestamp: Date.now(),
                };
                this.sendToPeer(hostConnection.peerId, relayMessage);
            }
        }
    }
    relayMessage(message, fromPeerId) {
        if (!this.isHost) {
            console.error('Only host can relay messages');
            return;
        }
        const actualMessage = message.payload;
        this.broadcast(actualMessage, fromPeerId);
        this.onMessageHandlers.forEach((handler) => handler(actualMessage));
    }
    disconnectPeer(peerId) {
        const connection = this.connections.get(peerId);
        if (connection) {
            connection.peer.destroy();
            this.connections.delete(peerId);
            console.log(`Disconnected from ${peerId}`);
        }
    }
    disconnectAll() {
        console.log('Disconnecting from all peers...');
        this.connections.forEach((connection) => {
            connection.peer.destroy();
        });
        this.connections.clear();
    }
    getConnectedPeers() {
        return Array.from(this.connections.keys()).filter((peerId) => {
            const conn = this.connections.get(peerId);
            return conn?.connected;
        });
    }
    getConnectionCount() {
        return this.getConnectedPeers().length;
    }
    isConnectedTo(peerId) {
        const connection = this.connections.get(peerId);
        return connection?.connected ?? false;
    }
    onMessage(handler) {
        this.onMessageHandlers.push(handler);
    }
    onPeerConnected(handler) {
        this.onPeerConnectedHandlers.push(handler);
    }
    onPeerDisconnected(handler) {
        this.onPeerDisconnectedHandlers.push(handler);
    }
    getStatus() {
        return {
            isHost: this.isHost,
            accordId: this.accordId,
            connectionCount: this.getConnectionCount(),
            connections: Array.from(this.connections.values()).map((conn) => ({
                peerId: conn.peerId,
                connected: conn.connected,
                connectedAt: conn.connectedAt,
            })),
        };
    }
}
//# sourceMappingURL=peer-connection.js.map