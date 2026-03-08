import type { Libp2p } from 'libp2p';
export interface MessageHandler {
    (message: any, from: string): void;
}
export declare class PubSubMessaging {
    private libp2p;
    private subscriptions;
    constructor(libp2p: Libp2p);
    subscribe(accordId: string, handler: MessageHandler): Promise<void>;
    unsubscribe(accordId: string): Promise<void>;
    publish(accordId: string, message: any): Promise<void>;
    announcePresence(accordId: string, metadata: any): Promise<void>;
    sendChatMessage(accordId: string, text: string, from: string): Promise<void>;
    sendSignal(accordId: string, targetPeerId: string, signalData: any): Promise<void>;
    getTopics(): string[];
    getTopicPeers(accordId: string): string[];
    private handleMessage;
    private createTopic;
    getStatus(): {
        enabled: boolean;
        topics: string[];
        totalPeers: number;
    };
    createDMTopic(peerId1: string, peerId2: string): string;
    subscribeDM(otherPeerId: string, handler: MessageHandler): Promise<void>;
    sendDM(otherPeerId: string, text: string): Promise<void>;
}
//# sourceMappingURL=pubsub-messaging.d.ts.map