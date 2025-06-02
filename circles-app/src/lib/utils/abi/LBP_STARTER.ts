const LBP_STARTER_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "InvalidAmount",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidFinalWeight",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidInitWeight",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidSwapFee",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyBaseGroupsAreSupported",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyStarter",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "OnlyTwoTokenLBPSupported",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "creator",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "group",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "lbp",
                "type": "address"
            }
        ],
        "name": "GroupLBPCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "creator",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "group",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "asset",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "lbpStarter",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "groupAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "assetAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "groupInitWeight",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "groupFinalWeight",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "swapFee",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "updateWeightDuration",
                "type": "uint256"
            }
        ],
        "name": "LBPStarterCreated",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "BALANCER_WEIGHTED_MATH",
        "outputs": [
            {
                "internalType": "contract IExternalWeightedMath",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "BASE_GROUP_FACTORY",
        "outputs": [
            {
                "internalType": "contract IBaseGroupFactory",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "HUB_V2",
        "outputs": [
            {
                "internalType": "contract IHub",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "LBP_FACTORY",
        "outputs": [
            {
                "internalType": "contract INoProtocolFeeLiquidityBootstrappingPoolFactory",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "VAULT",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "group",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "asset",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "groupAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "assetAmount",
                "type": "uint256"
            }
        ],
        "name": "createLBPStarter",
        "outputs": [
            {
                "internalType": "address",
                "name": "lbpStarter",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "group",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "asset",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "groupAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "assetAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "groupInitWeight",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "groupFinalWeight",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "swapFee",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "updateWeightDuration",
                "type": "uint256"
            }
        ],
        "name": "createLBPStarter",
        "outputs": [
            {
                "internalType": "address",
                "name": "lbpStarter",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export default LBP_STARTER_ABI;