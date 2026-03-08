---
language: typescript
framework: hardhat, libp2p, ethers
build_cmd: npm run build
test_cmd: npm run test
lint_cmd:
fmt_cmd:
birth_date: 2026-03-08
---

System: Accord — a decentralized chat system where communities register on the blockchain, manage peers via libp2p, and communicate through P2P messaging with wallet-based authentication and moderation.

    Feature: Accord Registration on Blockchain

        Scenario: Register a new Accord
            Given I am connected to a blockchain network with the AccordRegistry contract deployed
            When I call `registerAccord(ipfsHash)` with sufficient registration fee
            Then the contract should store my Accord with the provided IPFS hash

        Scenario: Register Accord with insufficient fee
            Given I am connected to the AccordRegistry contract
            When I call `registerAccord(ipfsHash)` with less than the registration fee
            Then the transaction should revert with "Insufficient registration fee"

        Scenario: Update Accord metadata
            Given I am the owner of an existing Accord
            When I call `updateMetadata(accordId, newIpfsHash)`
            Then the contract should update the IPFS hash

        Scenario: Transfer Accord ownership
            Given I am the owner of an existing Accord
            When I call `transferAccordOwnership(accordId, newOwner)`
            Then the contract should transfer ownership to the new address

        Scenario: Query Accord details
            Given an Accord has been registered on the blockchain
            When I call `getAccord(accordId)`
            Then I should receive the owner address, IPFS hash, creation timestamp, and active status

        Scenario: List all active Accords
            Given multiple Accords have been registered
            When I call `getActiveAccords()`
            Then I should receive only the IDs of Accords that are currently active

    Feature: IPFS Metadata Management

        Scenario: Upload valid Accord metadata
            Given I have valid metadata with name, description, category, and rules
            When I call `uploadMetadata(metadata)`
            Then the metadata should be uploaded to IPFS via Pinata

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

        Scenario: Upload ban list to IPFS
            Given I have a ban list object with banned addresses
            When I call `uploadBanList(banList)`
            Then the ban list should be uploaded to IPFS

    Feature: P2P Node Initialization

        Scenario: Start libp2p node with default config
            Given I have created a new Libp2pNode instance
            When I call `start()`
            Then the node should initialize with WebSockets, noise encryption, mplex, DHT, and gossipsub

        Scenario: Get node status
            Given a libp2p node has been started
            When I call `getStatus()`
            Then I should receive the started status, peer ID, peer count, and multiaddresses

        Scenario: Stop libp2p node
            Given a libp2p node is running
            When I call `stop()`
            Then the node should shut down gracefully

    Feature: Peer Discovery via DHT

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

    Feature: WebRTC Star Topology

        Scenario: First peer becomes host
            Given I am joining an Accord with no existing peers
            When I call `joinAccord(accordId)`
            Then I should become the host of the Accord

        Scenario: Connect to existing host
            Given there is an existing host in an Accord
            When I call `joinAccord(accordId)`
            Then I should connect to the host via WebRTC

        Scenario: Send chat message as host
            Given I am the host of an Accord
            When I call `sendMessage(text, from)`
            Then the message should be broadcast to all connected peers

        Scenario: Send chat message as peer
            Given I am a peer connected to a host
            When I call `sendMessage(text, from)`
            Then the message should be sent to the host

        Scenario: Handle host migration when host disconnects
            Given I am a peer connected to a host
            When the host disconnects unexpectedly
            Then a new host should be elected from remaining peers

        Scenario: Receive message from WebRTC connection
            Given I am connected to an Accord
            When a peer sends a message
            Then I should receive the message through my message handler

    Feature: Wallet Authentication

        Scenario: Create authentication challenge
            Given I want to authenticate to an Accord
            When I call `createChallenge(accordId, peerId)`
            Then I should receive a challenge message with a nonce and timestamp

        Scenario: Verify valid authentication credentials
            Given I have signed the authentication challenge
            When I call `verifyCredentials(credentials, peerId)`
            Then the signature should be verified

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

    Feature: Peer Identity Management

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

    Feature: Ban Management

        Scenario: Ban a peer
            Given I am an authenticated admin
            When I call `banPeer(targetPeerId, reason)`
            Then the peer should be added to the ban list

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

    Feature: Kick Management

        Scenario: Kick a peer
            Given I am an authenticated admin
            When I call `kickPeer(targetPeerId, reason, durationMinutes)`
            Then the peer should be temporarily removed

        Scenario: Check if peer is kicked
            Given a peer has been kicked
            When I call `isPeerKicked(peerId)`
            Then it should return true if the kick is still active

        Scenario: Kick expires automatically
            Given a peer was kicked with a 5-minute duration
            When more than 5 minutes have passed
            Then the kick should no longer be enforced

    Feature: Admin Management

        Scenario: Add admin
            Given I am the Accord owner
            When I call `addAdmin(address, role)`
            Then the address should be added as an admin

        Scenario: Check if address is admin
            Given an admin has been added
            When I call `isAdmin(address)`
            Then it should return true

        Scenario: Remove admin
            Given I am the Accord owner
            When I call `removeAdmin(address)`
            Then the address should be removed from admin list

    Feature: Consensus Verification

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

    Feature: Moderation Enforcer

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

    Feature: Contract Admin and Fee Management

        Scenario: Withdraw accumulated fees
            Given I am the contract owner
            When I call `withdrawFees()`
            Then the contract should transfer all accumulated fees to my address

        Scenario: Withdraw fails with no fees
            Given the contract has no accumulated fees
            When I call `withdrawFees()`
            Then it should revert with "No fees to withdraw"

        Scenario: Update registration fee
            Given I am the contract owner
            When I call `setRegistrationFee(newFee)`
            Then the contract should update the registration fee to the new amount

        Scenario: Update unregistration fee
            Given I am the contract owner
            When I call `setUnregistrationFee(newFee)`
            Then the contract should update the unregistration fee to the new amount

        Scenario: Emergency pause accord
            Given I am the contract owner
            When I call `emergencyPauseAccord(accordId)` on an active accord
            Then the accord should be marked as inactive

        Scenario: Query contract balance
            Given the contract has received fees
            When I call `getBalance()`
            Then I should receive the total ETH balance of the contract

        Scenario: Prevent direct ETH sends
            Given the contract has a receive function
            When someone sends ETH directly to the contract address
            Then the transaction should revert with "Use registerAccord() or unregisterAccord()"
