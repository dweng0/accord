/**
 * PubSub Messaging via GossipSub
 * Handles publish/subscribe messaging for Accord chat
 */

import type { Libp2p } from 'libp2p';

export interface MessageHandler {
  (message: any, from: string): void;
}

export class PubSubMessaging {
  private libp2p: Libp2p;
  private subscriptions: Map<string, MessageHandler> = new Map();

  constructor(libp2p: Libp2p) {
    this.libp2p = libp2p;
  }

  /**
   * Subscribe to an Accord topic
   */
  async subscribe(accordId: string, handler: MessageHandler): Promise<void> {
    try {
      const topic = this.createTopic(accordId);
      console.log(`📥 Subscribing to topic: ${topic}`);

      const pubsub = this.libp2p.services.pubsub as any;
      if (!pubsub) {
        throw new Error('PubSub not enabled');
      }

      // Store handler
      this.subscriptions.set(topic, handler);

      // Subscribe to topic
      pubsub.subscribe(topic);

      // Set up message handler
      pubsub.addEventListener('message', (evt: any) => {
        if (evt.detail.topic === topic) {
          this.handleMessage(evt.detail, handler);
        }
      });

      console.log(`✅ Subscribed to Accord: ${accordId}`);
    } catch (error: any) {
      throw new Error(`Failed to subscribe: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from an Accord topic
   */
  async unsubscribe(accordId: string): Promise<void> {
    try {
      const topic = this.createTopic(accordId);
      console.log(`📤 Unsubscribing from topic: ${topic}`);

      const pubsub = this.libp2p.services.pubsub as any;
      if (!pubsub) {
        throw new Error('PubSub not enabled');
      }

      pubsub.unsubscribe(topic);
      this.subscriptions.delete(topic);

      console.log(`✅ Unsubscribed from Accord: ${accordId}`);
    } catch (error: any) {
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }
  }

  /**
   * Publish a message to an Accord
   */
  async publish(accordId: string, message: any): Promise<void> {
    try {
      const topic = this.createTopic(accordId);

      const pubsub = this.libp2p.services.pubsub as any;
      if (!pubsub) {
        throw new Error('PubSub not enabled');
      }

      // Serialize message
      const data = new TextEncoder().encode(JSON.stringify(message));

      // Publish to topic
      await pubsub.publish(topic, data);

      console.log(`📨 Published message to Accord: ${accordId}`);
    } catch (error: any) {
      throw new Error(`Failed to publish message: ${error.message}`);
    }
  }

  /**
   * Broadcast presence announcement
   */
  async announcePresence(accordId: string, metadata: any): Promise<void> {
    const message = {
      type: 'presence',
      peerId: this.libp2p.peerId.toString(),
      metadata,
      timestamp: Date.now(),
    };

    await this.publish(accordId, message);
  }

  /**
   * Send chat message
   */
  async sendChatMessage(accordId: string, text: string, from: string): Promise<void> {
    const message = {
      type: 'chat',
      from,
      text,
      timestamp: Date.now(),
    };

    await this.publish(accordId, message);
  }

  /**
   * Send WebRTC signaling data
   */
  async sendSignal(accordId: string, targetPeerId: string, signalData: any): Promise<void> {
    const message = {
      type: 'webrtc-signal',
      from: this.libp2p.peerId.toString(),
      to: targetPeerId,
      signal: signalData,
      timestamp: Date.now(),
    };

    await this.publish(accordId, message);
  }

  /**
   * Get subscribed topics
   */
  getTopics(): string[] {
    const pubsub = this.libp2p.services.pubsub as any;
    if (!pubsub) {
      return [];
    }

    return pubsub.getTopics();
  }

  /**
   * Get peers subscribed to a topic
   */
  getTopicPeers(accordId: string): string[] {
    const topic = this.createTopic(accordId);
    const pubsub = this.libp2p.services.pubsub as any;

    if (!pubsub) {
      return [];
    }

    const peers = pubsub.getSubscribers(topic);
    return peers ? peers.map((p: any) => p.toString()) : [];
  }

  /**
   * Handle incoming message
   */
  private handleMessage(msg: any, handler: MessageHandler): void {
    try {
      // Decode message
      const text = new TextDecoder().decode(msg.data);
      const message = JSON.parse(text);

      // Get sender
      const from = msg.from?.toString() || 'unknown';

      // Call handler
      handler(message, from);
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * Create topic name from Accord ID
   */
  private createTopic(accordId: string): string {
    return `/accord/${accordId}/chat`;
  }

  /**
   * Get PubSub status
   */
  getStatus(): {
    enabled: boolean;
    topics: string[];
    totalPeers: number;
  } {
    const pubsub = this.libp2p.services.pubsub as any;

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

  /**
   * Create DM (direct message) topic
   */
  createDMTopic(peerId1: string, peerId2: string): string {
    // Create consistent topic regardless of order
    const sorted = [peerId1, peerId2].sort();
    return `/accord/dm/${sorted[0]}/${sorted[1]}`;
  }

  /**
   * Subscribe to DM topic
   */
  async subscribeDM(otherPeerId: string, handler: MessageHandler): Promise<void> {
    const myPeerId = this.libp2p.peerId.toString();
    const topic = this.createDMTopic(myPeerId, otherPeerId);

    const pubsub = this.libp2p.services.pubsub as any;
    if (!pubsub) {
      throw new Error('PubSub not enabled');
    }

    this.subscriptions.set(topic, handler);
    pubsub.subscribe(topic);

    pubsub.addEventListener('message', (evt: any) => {
      if (evt.detail.topic === topic) {
        this.handleMessage(evt.detail, handler);
      }
    });

    console.log(`✅ Subscribed to DM with: ${otherPeerId}`);
  }

  /**
   * Send DM
   */
  async sendDM(otherPeerId: string, text: string): Promise<void> {
    const myPeerId = this.libp2p.peerId.toString();
    const topic = this.createDMTopic(myPeerId, otherPeerId);

    const message = {
      type: 'dm',
      from: myPeerId,
      text,
      timestamp: Date.now(),
    };

    const pubsub = this.libp2p.services.pubsub as any;
    if (!pubsub) {
      throw new Error('PubSub not enabled');
    }

    const data = new TextEncoder().encode(JSON.stringify(message));
    await pubsub.publish(topic, data);
  }
}
