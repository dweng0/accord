export class PubSubMessaging {
    libp2p;
    subscriptions = new Map();
    constructor(libp2p) {
        this.libp2p = libp2p;
    }
    async subscribe(accordId, handler) {
        try {
            const topic = this.createTopic(accordId);
            console.log(`📥 Subscribing to topic: ${topic}`);
            const pubsub = this.libp2p.services.pubsub;
            if (!pubsub) {
                throw new Error('PubSub not enabled');
            }
            this.subscriptions.set(topic, handler);
            pubsub.subscribe(topic);
            pubsub.addEventListener('message', (evt) => {
                if (evt.detail.topic === topic) {
                    this.handleMessage(evt.detail, handler);
                }
            });
            console.log(`✅ Subscribed to Accord: ${accordId}`);
        }
        catch (error) {
            throw new Error(`Failed to subscribe: ${error.message}`);
        }
    }
    async unsubscribe(accordId) {
        try {
            const topic = this.createTopic(accordId);
            console.log(`📤 Unsubscribing from topic: ${topic}`);
            const pubsub = this.libp2p.services.pubsub;
            if (!pubsub) {
                throw new Error('PubSub not enabled');
            }
            pubsub.unsubscribe(topic);
            this.subscriptions.delete(topic);
            console.log(`✅ Unsubscribed from Accord: ${accordId}`);
        }
        catch (error) {
            throw new Error(`Failed to unsubscribe: ${error.message}`);
        }
    }
    async publish(accordId, message) {
        try {
            const topic = this.createTopic(accordId);
            const pubsub = this.libp2p.services.pubsub;
            if (!pubsub) {
                throw new Error('PubSub not enabled');
            }
            const data = new TextEncoder().encode(JSON.stringify(message));
            await pubsub.publish(topic, data);
            console.log(`📨 Published message to Accord: ${accordId}`);
        }
        catch (error) {
            throw new Error(`Failed to publish message: ${error.message}`);
        }
    }
    async announcePresence(accordId, metadata) {
        const message = {
            type: 'presence',
            peerId: this.libp2p.peerId.toString(),
            metadata,
            timestamp: Date.now(),
        };
        await this.publish(accordId, message);
    }
    async sendChatMessage(accordId, text, from) {
        const message = {
            type: 'chat',
            from,
            text,
            timestamp: Date.now(),
        };
        await this.publish(accordId, message);
    }
    async sendSignal(accordId, targetPeerId, signalData) {
        const message = {
            type: 'webrtc-signal',
            from: this.libp2p.peerId.toString(),
            to: targetPeerId,
            signal: signalData,
            timestamp: Date.now(),
        };
        await this.publish(accordId, message);
    }
    getTopics() {
        const pubsub = this.libp2p.services.pubsub;
        if (!pubsub) {
            return [];
        }
        return pubsub.getTopics();
    }
    getTopicPeers(accordId) {
        const topic = this.createTopic(accordId);
        const pubsub = this.libp2p.services.pubsub;
        if (!pubsub) {
            return [];
        }
        const peers = pubsub.getSubscribers(topic);
        return peers ? peers.map((p) => p.toString()) : [];
    }
    handleMessage(msg, handler) {
        try {
            const text = new TextDecoder().decode(msg.data);
            const message = JSON.parse(text);
            const from = msg.from?.toString() || 'unknown';
            handler(message, from);
        }
        catch (error) {
            console.error('Failed to handle message:', error);
        }
    }
    createTopic(accordId) {
        return `/accord/${accordId}/chat`;
    }
    getStatus() {
        const pubsub = this.libp2p.services.pubsub;
        if (!pubsub) {
            return {
                enabled: false,
                topics: [],
                totalPeers: 0,
            };
        }
        const topics = this.getTopics();
        const totalPeers = topics.reduce((sum, topic) => {
            return sum + (pubsub.getSubscribers(topic)?.length || 0);
        }, 0);
        return {
            enabled: true,
            topics,
            totalPeers,
        };
    }
    createDMTopic(peerId1, peerId2) {
        const sorted = [peerId1, peerId2].sort();
        return `/accord/dm/${sorted[0]}/${sorted[1]}`;
    }
    async subscribeDM(otherPeerId, handler) {
        const myPeerId = this.libp2p.peerId.toString();
        const topic = this.createDMTopic(myPeerId, otherPeerId);
        const pubsub = this.libp2p.services.pubsub;
        if (!pubsub) {
            throw new Error('PubSub not enabled');
        }
        this.subscriptions.set(topic, handler);
        pubsub.subscribe(topic);
        pubsub.addEventListener('message', (evt) => {
            if (evt.detail.topic === topic) {
                this.handleMessage(evt.detail, handler);
            }
        });
        console.log(`✅ Subscribed to DM with: ${otherPeerId}`);
    }
    async sendDM(otherPeerId, text) {
        const myPeerId = this.libp2p.peerId.toString();
        const topic = this.createDMTopic(myPeerId, otherPeerId);
        const message = {
            type: 'dm',
            from: myPeerId,
            text,
            timestamp: Date.now(),
        };
        const pubsub = this.libp2p.services.pubsub;
        if (!pubsub) {
            throw new Error('PubSub not enabled');
        }
        const data = new TextEncoder().encode(JSON.stringify(message));
        await pubsub.publish(topic, data);
    }
}
//# sourceMappingURL=pubsub-messaging.js.map