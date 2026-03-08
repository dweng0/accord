---
language: typescript
build: npm run build
test: npm run test
---

# Accord - Decentralized Chat System

## Phase 1: Core Infrastructure

### Feature: Accord Registration on Blockchain

    As an Accord owner
    I want to register my community on the blockchain
    So that users can discover and join my Accord

    Scenario: Register a new Accord
        Given I am connected to a blockchain network with the AccordRegistry contract deployed
        And I have a valid IPFS hash containing my Accord metadata
        When I call `registerAccord(ipfsHash)` with sufficient registration fee
        Then the contract should store my Accord with the provided IPFS hash
        And emit an `AccordRegistered` event with my unique accordId
        And return the generated accordId

    Scenario: Register Accord with insufficient fee
        Given I am connected to the AccordRegistry contract
        When I call `registerAccord(ipfsHash)` with less than the registration fee
        Then the transaction should revert with "Insufficient registration fee"

    Scenario: Update Accord metadata
        Given I am the owner of an existing Accord
        When I call `updateMetadata(accordId, newIpfsHash)`
        Then the contract should update the IPFS hash
        And emit a `MetadataUpdated` event

    Scenario: Transfer Accord ownership
        Given I am the owner of an existing Accord
        When I call `transferAccordOwnership(accordId, newOwner)`
        Then the contract should transfer ownership to the new address
        And emit an `OwnershipTransferred` event

    Scenario: Query Accord details
        Given an Accord has been registered on the blockchain
        When I call `getAccord(accordId)`
        Then I should receive the owner address, IPFS hash, creation timestamp, and active status

    Scenario: List all active Accords
        Given multiple Accords have been registered
        When I call `getActiveAccords()`
        Then I should receive only the IDs of Accords that are currently active

### Feature: IPFS Metadata Management

    As an Accord creator
    I want to upload my community metadata to IPFS
    So that it can be stored immutably and retrieved by clients

    Scenario: Upload valid Accord metadata
        Given I have valid metadata with name, description, category, and rules
        When I call `uploadMetadata(metadata)`
        Then the metadata should be uploaded to IPFS via Pinata
        And return the IPFS hash

    Scenario: Upload metadata with invalid name
        Given I have metadata with an empty name
        When I call `uploadMetadata(metadata)`
        Then it should throw an error "Metadata must have a name"

    Scenario: Upload metadata without category
        Given I have metadata missing a category
        When I call `uploadMetadata(metadata)`
        Then it should throw an error "Metadata must have a category"

    Scenario: Upload image to IPFS
        Given I have a valid image file at a given path
        When I call `uploadImage(filePath)`
        Then the image should be uploaded to IPFS
        And return an ipfs:// URL

    Scenario: Upload ban list to IPFS
        Given I have a ban list object with banned addresses
        When I call `uploadBanList(banList)`
        Then the ban list should be uploaded to IPFS
        And return an ipfs:// URL

### Feature: P2P Node Initialization

    As a client
    I want to initialize a libp2p node
    So that I can participate in the P2P network

    Scenario: Start libp2p node with default config
        Given I have created a new Libp2pNode instance
        When I call `start()`
        Then the node should initialize with WebSockets, noise encryption, mplex, DHT, and gossipsub
        And the node should be started successfully

    Scenario: Get node status
        Given a libp2p node has been started
        When I call `getStatus()`
        Then I should receive the started status, peer ID, peer count, and multiaddresses

    Scenario: Stop libp2p node
        Given a libp2p node is running
        When I call `stop()`
        Then the node should shut down gracefully

### Feature: Peer Discovery via DHT

    As a participant
    I want to discover other peers in an Accord
    So that I can connect and communicate with them

    Scenario: Announce Accord presence to DHT
        Given I have a running libp2p node
        When I call `announceAccord(accordId)`
        Then my peer should be announced to the DHT under the accord key

    Scenario: Find peers in an Accord
        Given other peers have announced their presence in an Accord
        When I call `findPeers(accordId)`
        Then I should receive a list of peer IDs that have joined that Accord

    Scenario: Subscribe to Accord pubsub topic
        Given I have a PubSubMessaging instance
        When I call `subscribe(accordId, handler)`
        Then I should receive messages published to the Accord topic

    Scenario: Publish message to Accord
        Given I am subscribed to an Accord topic
        When I call `publish(accordId, message)`
        Then the message should be broadcast to all subscribers

### Feature: WebRTC Star Topology

    As a chat participant
    I want to connect to other peers via WebRTC
    So that I can send and receive real-time messages

    Scenario: First peer becomes host
        Given I am joining an Accord with no existing peers
        When I call `joinAccord(accordId)`
        Then I should become the host of the Accord

    Scenario: Connect to existing host
        Given there is an existing host in an Accord
        When I call `joinAccord(accordId)`
        Then I should connect to the host via WebRTC
        And my role should be "peer"

    Scenario: Send chat message as host
        Given I am the host of an Accord
        When I call `sendMessage(text, from)`
        Then the message should be broadcast to all connected peers

    Scenario: Send chat message as peer
        Given I am a peer connected to a host
        When I call `sendMessage(text, from)`
        Then the message should be sent to the host
        And the host should relay it to other peers

    Scenario: Handle host migration when host disconnects
        Given I am a peer connected to a host
        And the host disconnects unexpectedly
        When the migration is triggered
        Then a new host should be elected from remaining peers
        And I should reconnect to the new host

    Scenario: Receive message from WebRTC connection
        Given I am connected to an Accord
        When a peer sends a message
        Then I should receive the message through my message handler

### Feature: Wallet Authentication

    As a user
    I want to authenticate my wallet identity
    So that other participants know I am who I claim

    Scenario: Create authentication challenge
        Given I want to authenticate to an Accord
        When I call `createChallenge(accordId, peerId)`
        Then I should receive a challenge message with a nonce and timestamp

    Scenario: Verify valid authentication credentials
        Given I have signed the authentication challenge
        When I call `verifyCredentials(credentials, peerId)`
        Then the signature should be verified
        And I should receive a verified identity

    Scenario: Verify authentication with wrong signature
        Given I have signed the challenge with the wrong wallet
        When I call `verifyCredentials(credentials, peerId)`
        Then it should throw "Signature verification failed"

    Scenario: Verify expired challenge
        Given I have a challenge that is older than 5 minutes
        When I try to verify credentials with it
        Then it should throw "Challenge expired"

    Scenario: Check if peer is verified
        Given a peer has completed authentication
        When I call `isVerified(peerId)`
        Then it should return true

### Feature: Peer Identity Management

    As a participant
    I want to manage peer identities
    So that I can track who is in the Accord

    Scenario: Store peer identity
        Given I have verified a peer's wallet address
        When I call `setPeerIdentity(peerId, address)`
        Then the identity should be stored for future reference

    Scenario: Get peer identity
        Given a peer's identity has been stored
        When I call `getPeerIdentity(peerId)`
        Then I should receive the peer's wallet address

    Scenario: Get my own identity
        Given I have set my own identity
        When I call `getMyIdentity()`
        Then I should receive my peer ID and address

### Feature: Ban Management

    As an Accord admin
    I want to permanently ban problematic users
    So that they cannot rejoin the community

    Scenario: Ban a peer
        Given I am an authenticated admin
        When I call `banPeer(targetPeerId, reason)`
        Then the peer should be added to the ban list
        And the ban should be broadcast to all peers
        And the target should be disconnected

    Scenario: Check if address is banned
        Given a peer has been banned
        When I call `isAddressBanned(address)`
        Then it should return true

    Scenario: Check if peer is banned
        Given a peer has been banned
        When I call `isPeerBanned(peerId)`
        Then it should return true

    Scenario: Unban an address
        Given I am an admin
        When I call `unbanAddress(address)`
        Then the address should be removed from the ban list

    Scenario: Export ban list to IPFS
        Given I have ban entries in the ban manager
        When I call `uploadBanList()`
        Then the ban list should be uploaded to IPFS
        And return the IPFS hash

### Feature: Kick Management

    As an Accord admin
    I want to temporarily remove disruptive users
    So that they can rejoin after a cooling period

    Scenario: Kick a peer
        Given I am an authenticated admin
        When I call `kickPeer(targetPeerId, reason, durationMinutes)`
        Then the peer should be temporarily removed
        And a kick message should be broadcast

    Scenario: Check if peer is kicked
        Given a peer has been kicked
        When I call `isPeerKicked(peerId)`
        Then it should return true if the kick is still active

    Scenario: Kick expires automatically
        Given a peer was kicked with a 5-minute duration
        When more than 5 minutes have passed
        Then the kick should no longer be enforced

### Feature: Admin Management

    As an Accord owner
    I want to appoint other admins
    So that they can help moderate the community

    Scenario: Add admin
        Given I am the Accord owner
        When I call `addAdmin(address, role)`
        Then the address should be added as an admin
        And the admin list should be uploaded to IPFS

    Scenario: Check if address is admin
        Given an admin has been added
        When I call `isAdmin(address)`
        Then it should return true

    Scenario: Remove admin
        Given I am the Accord owner
        When I call `removeAdmin(address)`
        Then the address should be removed from admin list

### Feature: Consensus Verification

    As a participant
    I want to verify moderator actions are legitimate
    So that unauthorized users cannot abuse moderation

    Scenario: Verify ban signature
        Given I received a ban message from another peer
        When I call `verifyBanSignature(message)`
        Then it should verify the signature matches the bannedBy address

    Scenario: Verify kick signature
        Given I received a kick message from another peer
        When I call `verifyKickSignature(message)`
        Then it should verify the signature matches the kickedBy address

    Scenario: Verify admin action authorization
        Given I received a moderation action
        When I check if the sender is an admin
        Then the action should only be processed if sender is admin

### Feature: Moderation Enforcer

    As a participant
    I want to automatically enforce moderation decisions
    So that bans and kicks are applied consistently

    Scenario: Enforce ban on peer connection
        Given a peer is on the ban list
        When the peer tries to connect
        Then the connection should be rejected

    Scenario: Enforce kick on peer connection
        Given a peer has an active kick
        When the peer tries to connect
        Then the connection should be rejected

    Scenario: Moderation action triggers UI update
        Given a moderation action (ban/kick) occurs
        When the action is processed
        Then all connected peers should be notified
