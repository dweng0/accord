/**
 * Core type definitions for Accord
 */

// ============ Blockchain Types ============

export interface Accord {
  owner: string;
  ipfsHash: string;
  createdAt: number;
  active: boolean;
}

export interface AccordRegistryConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
}

// ============ IPFS Types ============

export interface AccordMetadata {
  version: string;
  name: string;
  description: string;
  icon: string;
  banner: string;
  category: string;
  rules: string[];
  banlist: string;
  adminlist: string;
  createdAt: number;
  links?: {
    website?: string;
    twitter?: string;
    discord?: string;
  };
}

export interface BanEntry {
  address: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
  signature: string;
}

export interface BanList {
  version: string;
  bans: BanEntry[];
}

export interface AdminEntry {
  address: string;
  addedAt: number;
  addedBy: string;
  signature: string;
  role: string;
}

export interface AdminList {
  version: string;
  admins: AdminEntry[];
}

// ============ P2P Types ============

export interface PeerInfo {
  peerId: string;
  multiaddrs: string[];
  address?: string;
  joinedAt: number;
  isAdmin?: boolean;
}

export interface JoinRequest {
  type: 'join_request';
  accordId: string;
  address: string;
  signature: string;
  message: string;
  timestamp: number;
}

export interface VerificationResult {
  verified: boolean;
  isBanned: boolean;
  isAdmin: boolean;
  reason: string | null;
  bannedAt?: number;
}

// ============ WebRTC Types ============

export interface Message {
  type: 'chat' | 'kick' | 'ban' | 'peerList' | 'hostMigration' | 'presence';
  from?: string;
  data?: any;
  timestamp: number;
}

export interface ChatMessage extends Message {
  type: 'chat';
  from: string;
  text: string;
  channel?: string;
}

export interface KickMessage extends Message {
  type: 'kick';
  target: string;
  reason: string;
  expiresAt: number;
  signature: string;
}

export interface KickEntry {
  address: string;
  reason: string;
  kickedAt: number;
  kickedBy: string;
  expiresAt: number;
  signature: string;
}

// ============ Configuration Types ============

export interface AccordConfig {
  blockchain: AccordRegistryConfig;
  ipfs: {
    apiKey?: string;
    secretKey?: string;
    gateway?: string;
  };
  p2p: {
    bootstrapNodes?: string[];
  };
}

export enum PeerRole {
  HOST = 'host',
  PEER = 'peer',
}

export interface ConnectionInfo {
  role: PeerRole;
  isOwner: boolean;
  isAdmin: boolean;
  accordId: string;
  metadata: AccordMetadata;
}
