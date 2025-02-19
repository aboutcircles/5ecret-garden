const coreMemberGroupABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "proxy", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "mintHandler", "type": "address" },
            { "indexed": false, "internalType": "address", "name": "redemptionHandler", "type": "address" }
        ],
        "name": "CMGroupCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "mastercopy", "type": "address" }
        ],
        "name": "MasterCopyDeployed",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_service", "type": "address" },
            { "internalType": "address[]", "name": "_initialConditions", "type": "address[]" },
            { "internalType": "string", "name": "_name", "type": "string" },
            { "internalType": "string", "name": "_symbol", "type": "string" },
            { "internalType": "bytes32", "name": "_metadataDigest", "type": "bytes32" }
        ],
        "name": "createCMGroup",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "masterCopyCMGroup",
        "outputs": [
            { "internalType": "contract CoreMembersGroup", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export default coreMemberGroupABI;
