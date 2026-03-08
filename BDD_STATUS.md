# BDD Status

Checked 49 scenario(s) across 18 test file(s).


## Feature: Unknown Feature

- [x] Register a new Accord
- [x] Register Accord with insufficient fee
- [x] Update Accord metadata
- [x] Transfer Accord ownership
- [ ] UNCOVERED: Query Accord details
- [x] List all active Accords
- [ ] UNCOVERED: Upload valid Accord metadata
- [ ] UNCOVERED: Upload metadata with invalid name
- [ ] UNCOVERED: Upload metadata without category
- [x] Upload image to IPFS
- [x] Upload ban list to IPFS
- [x] Start libp2p node with default config
- [x] Get node status
- [x] Stop libp2p node
- [x] Announce Accord presence to DHT
- [x] Find peers in an Accord
- [x] Subscribe to Accord pubsub topic
- [x] Publish message to Accord
- [ ] UNCOVERED: First peer becomes host
- [x] Connect to existing host
- [ ] UNCOVERED: Send chat message as host
- [x] Send chat message as peer
- [ ] UNCOVERED: Handle host migration when host disconnects
- [x] Receive message from WebRTC connection
- [x] Create authentication challenge
- [ ] UNCOVERED: Verify valid authentication credentials
- [ ] UNCOVERED: Verify authentication with wrong signature
- [x] Verify expired challenge
- [x] Check if peer is verified
- [ ] UNCOVERED: Store peer identity
- [ ] UNCOVERED: Get peer identity
- [ ] UNCOVERED: Get my own identity
- [ ] UNCOVERED: Ban a peer
- [x] Check if address is banned
- [x] Check if peer is banned
- [ ] UNCOVERED: Unban an address
- [x] Export ban list to IPFS
- [ ] UNCOVERED: Kick a peer
- [x] Check if peer is kicked
- [ ] UNCOVERED: Kick expires automatically
- [x] Add admin
- [x] Check if address is admin
- [x] Remove admin
- [ ] UNCOVERED: Verify ban signature
- [ ] UNCOVERED: Verify kick signature
- [ ] UNCOVERED: Verify admin action authorization
- [x] Enforce ban on peer connection
- [x] Enforce kick on peer connection
- [ ] UNCOVERED: Moderation action triggers UI update

---
**29/49 scenarios covered.**

20 scenario(s) need tests:
- Query Accord details
- Upload valid Accord metadata
- Upload metadata with invalid name
- Upload metadata without category
- First peer becomes host
- Send chat message as host
- Handle host migration when host disconnects
- Verify valid authentication credentials
- Verify authentication with wrong signature
- Store peer identity
- Get peer identity
- Get my own identity
- Ban a peer
- Unban an address
- Kick a peer
- Kick expires automatically
- Verify ban signature
- Verify kick signature
- Verify admin action authorization
- Moderation action triggers UI update
