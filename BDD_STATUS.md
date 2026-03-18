# BDD Status

Checked 56 scenario(s) across 26 test file(s).


## Feature: Accord Registration on Blockchain

- [x] Register a new Accord
- [x] Register Accord with insufficient fee
- [x] Update Accord metadata
- [x] Transfer Accord ownership
- [x] Query Accord details
- [x] List all active Accords

## Feature: IPFS Metadata Management

- [x] Upload valid Accord metadata
- [x] Upload metadata with invalid name
- [x] Upload metadata without category
- [x] Upload image to IPFS
- [x] Upload ban list to IPFS

## Feature: P2P Node Initialization

- [x] Start libp2p node with default config
- [x] Get node status
- [x] Stop libp2p node

## Feature: Peer Discovery via DHT

- [x] Announce Accord presence to DHT
- [x] Find peers in an Accord
- [x] Subscribe to Accord pubsub topic
- [x] Publish message to Accord

## Feature: WebRTC Star Topology

- [x] First peer becomes host
- [x] Connect to existing host
- [x] Send chat message as host
- [x] Send chat message as peer
- [x] Handle host migration when host disconnects
- [x] Receive message from WebRTC connection

## Feature: Wallet Authentication

- [x] Create authentication challenge
- [x] Verify valid authentication credentials
- [x] Verify authentication with wrong signature
- [x] Verify expired challenge
- [x] Check if peer is verified

## Feature: Peer Identity Management

- [x] Store peer identity
- [x] Get peer identity
- [x] Get my own identity

## Feature: Ban Management

- [x] Ban a peer
- [x] Check if address is banned
- [x] Check if peer is banned
- [x] Unban an address
- [x] Export ban list to IPFS

## Feature: Kick Management

- [x] Kick a peer
- [x] Check if peer is kicked
- [x] Kick expires automatically

## Feature: Admin Management

- [x] Add admin
- [x] Check if address is admin
- [x] Remove admin

## Feature: Consensus Verification

- [x] Verify ban signature
- [x] Verify kick signature
- [x] Verify admin action authorization

## Feature: Moderation Enforcer

- [x] Enforce ban on peer connection
- [x] Enforce kick on peer connection
- [x] Moderation action triggers UI update

## Feature: Contract Admin and Fee Management

- [x] Withdraw accumulated fees
- [x] Withdraw fails with no fees
- [x] Update registration fee
- [x] Update unregistration fee
- [x] Emergency pause accord
- [x] Query contract balance
- [x] Prevent direct ETH sends

---
**56/56 scenarios covered.**
