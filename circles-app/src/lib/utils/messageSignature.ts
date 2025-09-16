import { ethers } from 'ethers';
import Safe, { SigningMethod, hashSafeMessage } from '@safe-global/protocol-kit';
import { CirclesStorage } from '$lib/utils/storage';
import { wallet } from '$lib/stores/wallet.svelte';
import { get } from 'svelte/store';
import type { WalletType } from '$lib/utils/walletType';
import type { MessageData, MessageLink } from './messageTypes';

// EIP-712 Domain for signature verification
export const MESSAGE_DOMAIN = {
  chainId: 100,
};

// EIP-712 Types for the message structure
export const MESSAGE_TYPES = {
  CirclesMessage: [
    { name: 'name', type: 'string' },
    { name: 'cid', type: 'string' },
    { name: 'encrypted', type: 'bool' },
    { name: 'encryptionAlgorithm', type: 'string' },
    { name: 'encryptionKeyFingerprint', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'signerAddress', type: 'address' },
    { name: 'signedAt', type: 'uint256' },
    { name: 'nonce', type: 'string' }
  ]
};

/**
 * Verifies a message signature using multiple methods (Safe SDK, EOA typed data, message hash)
 */
export async function verifyMessageSignature(
  link: MessageLink,
  senderAddress: string
): Promise<boolean> {
  try {
    // Reconstruct the message data that should have been signed
    const messageData: MessageData = {
      name: link.name || "",
      cid: link.cid,
      encrypted: link.encrypted || false,
      encryptionAlgorithm: link.encryptionAlgorithm || "",
      encryptionKeyFingerprint: link.encryptionKeyFingerprint || "",
      chainId: BigInt(link.chainId || 100),
      signerAddress: link.signerAddress?.toLowerCase() || senderAddress.toLowerCase(),
      signedAt: BigInt(link.signedAt),
      nonce: link.nonce || '0x0'
    };

    const expectedAddress = messageData.signerAddress;
    const hash = ethers.TypedDataEncoder.hash(MESSAGE_DOMAIN, MESSAGE_TYPES, messageData);

    // Method 1: Try Safe signature verification
    if (window.ethereum) {
      try {
        const protocolKit = await Safe.init({
          provider: window.ethereum,
          safeAddress: expectedAddress
        });

        const eip712Data = {
          // @todo do not hardcode the chain
          domain: { chainId: 100 },
          types: {
            ...MESSAGE_TYPES,
            EIP712Domain: [{ name: 'chainId', type: 'uint256' }]
          },
          primaryType: 'CirclesMessage',
          message: messageData
        };
        
        const isValidSafeSignature = await protocolKit.isValidSignature(
          hashSafeMessage(eip712Data),
          link.signature
        );
        
        if (isValidSafeSignature) {
          console.log('Signature verified using Safe SDK');
          return true;
        }
      } catch (safeError) {
        console.log('Safe signature verification failed:', safeError);
      }
    }

    // Method 2: Try EOA typed data verification
    try {
      const recoveredFromTypedData = ethers.verifyTypedData(
        MESSAGE_DOMAIN, 
        MESSAGE_TYPES, 
        messageData, 
        link.signature
      );
      
      if (recoveredFromTypedData.toLowerCase() === expectedAddress) {
        console.log('Signature verified using EOA typed data method');
        return true;
      }
    } catch (typedDataError) {
      console.log('EOA typed data verification failed:', typedDataError);
    }

    // Method 3: Try message hash recovery
    try {
      const recoveredFromMessage = ethers.verifyMessage(
        ethers.getBytes(hash), 
        link.signature
      );
      
      if (recoveredFromMessage.toLowerCase() === expectedAddress) {
        console.log('Signature verified using message hash recovery');
        return true;
      }
    } catch (messageVerifyError) {
      console.log('Message hash verification failed:', messageVerifyError);
    }

    // All verification methods failed
    console.warn(`All verification methods failed for message ${link.cid}`);
    return false;
    
  } catch (error) {
    console.warn(`Signature verification failed for message ${link.cid}:`, error);
    return false;
  }
}

/**
 * Signs a message using Safe SDK
 */
async function signMessageWithSafe(messageData: MessageData): Promise<string> {
  try {
    const $wallet = get(wallet);
    if (!$wallet?.address) {
      throw new Error('Avatar address not available');
    }

    const provider = ($wallet as any).provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    const signer = await provider.getSigner();
    if (!signer) {
      throw new Error('No signer available');
    }

    // Initialize Safe SDK
    console.log("safe sdk: ", {
      provider: window.ethereum,
      signer: signer.address,
      safeAddress: $wallet.address
    })
    let protocolKit = await Safe.init({
      provider: window.ethereum,
      signer: signer.address,
      safeAddress: $wallet.address
    });

    console.log('Safe Protocol Kit initialized');
    const safeAddress = await protocolKit.getAddress();
    console.log('Safe address:', safeAddress);
    const safeContractVersion = await protocolKit.getContractVersion();
    console.log('Safe version:', safeContractVersion);

    const eip712Data = {
      domain: MESSAGE_DOMAIN,
      types: {
        ...MESSAGE_TYPES,
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
        ]
      },
      primaryType: 'CirclesMessage',
      message: messageData
    };

    console.log('EIP712 Data:', eip712Data);
    // @todo check the types
    const initialSafeMessage = await protocolKit.createMessage(eip712Data);
    console.log(initialSafeMessage);

    // Sign the safeMessage with the current signer
    
    console.log("signer wallet:", safeAddress)
    const signedSafeMessage = await protocolKit.signMessage(
      initialSafeMessage,
      SigningMethod.ETH_SIGN_TYPED_DATA_V4,
      safeAddress
    );

    const encodedSignatures = signedSafeMessage.encodedSignatures();
    console.log("encoded signature:", encodedSignatures);

    const safeMessageHash = await protocolKit.getSafeMessageHash(
      hashSafeMessage(eip712Data)
    );
    console.log("safe hash: ", safeMessageHash);

    // Check the validity of the signature
    const isValid = await protocolKit.isValidSignature(
      hashSafeMessage(eip712Data),
      encodedSignatures
    );
    console.log("is valid: ", isValid);

    console.log('Signed message:', encodedSignatures);
    return encodedSignatures;
    
  } catch (error) {
    console.error('Error signing message with Safe:', error);
    throw new Error(`Failed to sign message with Safe wallet: ${error.message}`);
  }
}

/**
 * Signs a message using EOA wallet
 */
async function signMessageWithEOA(messageData: MessageData): Promise<string> {
  try {
    const $wallet = get(wallet);
    // Get the BrowserProvider and then the signer
    const provider = ($wallet as any).provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    const signer = await provider.getSigner();
    if (!signer) {
      throw new Error('No signer available');
    }

    console.log('Signer type:', signer.constructor.name);

    // Sign using EIP-712 typed data - use _signTypedData for ethers v6
    let signature: string;
    try {
      if (typeof signer._signTypedData === 'function') {
        signature = await signer._signTypedData(MESSAGE_DOMAIN, MESSAGE_TYPES, messageData);
      } else if (typeof signer.signTypedData === 'function') {
        signature = await signer.signTypedData(MESSAGE_DOMAIN, MESSAGE_TYPES, messageData);
      } else {
        // Fallback: create the hash manually and sign it as a message
        const hash = ethers.TypedDataEncoder.hash(MESSAGE_DOMAIN, MESSAGE_TYPES, messageData);
        signature = await signer.signMessage(ethers.getBytes(hash));
      }
    } catch (signingError) {
      console.error('Signing error:', signingError);
      // Final fallback: create the hash and sign as message
      const hash = ethers.TypedDataEncoder.hash(MESSAGE_DOMAIN, MESSAGE_TYPES, messageData);
      signature = await signer.signMessage(ethers.getBytes(hash));
    }
    
    return signature;
  } catch (error) {
    console.error('Error signing message with EOA:', error);
    throw new Error(`Failed to sign message with EOA wallet: ${error.message}`);
  }
}

/**
 * Creates a message signature based on wallet type
 */
export async function createMessageSignature(messageData: MessageData): Promise<string> {
  const $wallet = get(wallet);
  
  // Get wallet type from storage (most reliable method)
  const storedWalletType = CirclesStorage.getInstance().walletType;
  const isSafeWallet = storedWalletType?.includes('safe') || false;
  // @todo check circles wallet flow
  const isCirclesWallet = storedWalletType?.includes('circles') || false;
  
  // Check if the avatar address differs from wallet address (indicates Safe usage)
  if (isSafeWallet || isCirclesWallet) {
    // This is a Safe wallet (either directly or through circles wallet acting as safe)
    return await signMessageWithSafe(messageData);
  } else {
    // This is a direct EOA wallet
    return await signMessageWithEOA(messageData);
  }
}