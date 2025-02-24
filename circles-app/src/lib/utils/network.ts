
const GNOSIS_CHAIN_ID_HEX = '0x64'; // Hexadecimal format for MetaMask request

//
// Switches to the Gnosis network if not already connected.
//
export async function switchOrAddGnosisNetwork() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Attempt to switch to the Gnosis network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: GNOSIS_CHAIN_ID_HEX }],
            });
        } catch (switchError: any) {
            // If the network is not added yet, error code 4902 indicates adding it is necessary
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: GNOSIS_CHAIN_ID_HEX,
                                chainName: 'Gnosis',
                                rpcUrls: ['https://rpc.gnosischain.com'],
                                nativeCurrency: {
                                    name: 'XDAI',
                                    symbol: 'XDAI',
                                    decimals: 18,
                                },
                                blockExplorerUrls: ['https://blockscout.com/poa/xdai/'],
                            },
                        ],
                    });
                } catch (addError) {
                    console.error('Failed to add the Gnosis network:', addError);
                }
            } else {
                console.error('Failed to switch to the Gnosis network:', switchError);
            }
        }
    } else {
        console.error(
            'window.ethereum is not available. Ensure MetaMask is installed.'
        );
    }
}