// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AccordRegistry
 * @notice Decentralized registry for Accord servers (Discord-like communities)
 * @dev Users pay to register Accords, protocol takes fee, owners can withdraw
 */
contract AccordRegistry is Ownable, ReentrancyGuard {

    // ============ Structs ============

    struct Accord {
        address owner;           // Accord creator/owner
        string ipfsHash;         // IPFS hash pointing to metadata
        uint256 createdAt;       // Registration timestamp
        bool active;             // false if unregistered
    }

    // ============ State Variables ============

    mapping(bytes32 => Accord) public accords;
    bytes32[] public accordIds;

    uint256 public registrationFee = 0.001 ether;    // Fee to register
    uint256 public unregistrationFee = 0.0005 ether; // Fee to unregister

    // ============ Events ============

    event AccordRegistered(
        bytes32 indexed accordId,
        address indexed owner,
        string ipfsHash,
        uint256 timestamp
    );

    event AccordUnregistered(
        bytes32 indexed accordId,
        address indexed owner,
        uint256 timestamp
    );

    event MetadataUpdated(
        bytes32 indexed accordId,
        string newIpfsHash,
        uint256 timestamp
    );

    event OwnershipTransferred(
        bytes32 indexed accordId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event FeesWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    event RegistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event UnregistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Owner is set via Ownable constructor
    }

    // ============ Core Functions ============

    /**
     * @notice Register a new Accord
     * @param ipfsHash IPFS hash containing Accord metadata (name, icon, etc.)
     * @return accordId Unique identifier for the Accord
     */
    function registerAccord(string memory ipfsHash)
        external
        payable
        returns (bytes32)
    {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        // Generate unique ID
        bytes32 accordId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, block.prevrandao)
        );

        // Ensure ID doesn't already exist (extremely unlikely)
        require(accords[accordId].createdAt == 0, "Accord ID collision");

        // Store Accord
        accords[accordId] = Accord({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            createdAt: block.timestamp,
            active: true
        });

        accordIds.push(accordId);

        emit AccordRegistered(accordId, msg.sender, ipfsHash, block.timestamp);

        // Refund excess payment
        if (msg.value > registrationFee) {
            payable(msg.sender).transfer(msg.value - registrationFee);
        }

        return accordId;
    }

    /**
     * @notice Unregister an Accord (marks as inactive, keeps data for history)
     * @param accordId The Accord to unregister
     */
    function unregisterAccord(bytes32 accordId)
        external
        payable
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(msg.value >= unregistrationFee, "Insufficient unregistration fee");

        // Mark as inactive
        accord.active = false;

        emit AccordUnregistered(accordId, msg.sender, block.timestamp);

        // Refund excess
        if (msg.value > unregistrationFee) {
            payable(msg.sender).transfer(msg.value - unregistrationFee);
        }
    }

    /**
     * @notice Update Accord metadata (free, owner-only)
     * @param accordId The Accord to update
     * @param newIpfsHash New IPFS hash with updated metadata
     */
    function updateMetadata(bytes32 accordId, string memory newIpfsHash)
        external
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");

        accord.ipfsHash = newIpfsHash;

        emit MetadataUpdated(accordId, newIpfsHash, block.timestamp);
    }

    /**
     * @notice Transfer Accord ownership
     * @param accordId The Accord to transfer
     * @param newOwner New owner address
     */
    function transferAccordOwnership(bytes32 accordId, address newOwner)
        external
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(newOwner != address(0), "Invalid new owner");

        address previousOwner = accord.owner;
        accord.owner = newOwner;

        emit OwnershipTransferred(accordId, previousOwner, newOwner, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @notice Get Accord info
     * @param accordId The Accord ID
     * @return Accord struct
     */
    function getAccord(bytes32 accordId)
        external
        view
        returns (Accord memory)
    {
        return accords[accordId];
    }

    /**
     * @notice Get all Accord IDs (active and inactive)
     * @return Array of Accord IDs
     */
    function getAllAccords()
        external
        view
        returns (bytes32[] memory)
    {
        return accordIds;
    }

    /**
     * @notice Get only active Accords
     * @return Array of active Accord IDs
     */
    function getActiveAccords()
        external
        view
        returns (bytes32[] memory)
    {
        uint256 activeCount = 0;

        // Count active accords
        for (uint256 i = 0; i < accordIds.length; i++) {
            if (accords[accordIds[i]].active) {
                activeCount++;
            }
        }

        // Build array of active IDs
        bytes32[] memory activeIds = new bytes32[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < accordIds.length; i++) {
            if (accords[accordIds[i]].active) {
                activeIds[index] = accordIds[i];
                index++;
            }
        }

        return activeIds;
    }

    /**
     * @notice Get total number of Accords
     * @return Total count
     */
    function getAccordCount()
        external
        view
        returns (uint256)
    {
        return accordIds.length;
    }

    /**
     * @notice Check if Accord exists and is active
     * @param accordId The Accord ID
     * @return true if active
     */
    function isAccordActive(bytes32 accordId)
        external
        view
        returns (bool)
    {
        return accords[accordId].active;
    }

    // ============ Admin Functions (Owner Only) ============

    /**
     * @notice Withdraw accumulated fees (owner only)
     * @dev Withdraws entire contract balance (all registration/unregistration fees)
     */
    function withdrawFees()
        external
        onlyOwner
        nonReentrant
    {
        uint256 amount = address(this).balance;
        require(amount > 0, "No fees to withdraw");

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(owner(), amount, block.timestamp);
    }

    /**
     * @notice Update registration fee (owner only)
     * @param newFee New fee in wei
     */
    function setRegistrationFee(uint256 newFee)
        external
        onlyOwner
    {
        uint256 oldFee = registrationFee;
        registrationFee = newFee;

        emit RegistrationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update unregistration fee (owner only)
     * @param newFee New fee in wei
     */
    function setUnregistrationFee(uint256 newFee)
        external
        onlyOwner
    {
        uint256 oldFee = unregistrationFee;
        unregistrationFee = newFee;

        emit UnregistrationFeeUpdated(oldFee, newFee);
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency pause for specific accord (owner only, security measure)
     * @param accordId Accord to pause
     * @dev Does NOT delete data, only marks inactive. Irreversible by design.
     */
    function emergencyPauseAccord(bytes32 accordId)
        external
        onlyOwner
    {
        require(accords[accordId].active, "Already inactive");
        accords[accordId].active = false;
        emit AccordUnregistered(accordId, accords[accordId].owner, block.timestamp);
    }

    // ============ Utility Functions ============

    /**
     * @notice Get contract balance
     */
    function getBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    /**
     * @notice Prevent accidental ETH sends
     */
    receive() external payable {
        revert("Use registerAccord() or unregisterAccord()");
    }
}
