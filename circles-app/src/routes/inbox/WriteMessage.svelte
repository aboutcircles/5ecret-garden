<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { popupControls } from '$lib/stores/popUp';
  import { wallet } from '$lib/stores/wallet.svelte';

  import ActionButton from '$lib/components/ActionButton.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { fetchFromIpfs, uploadToIpfs } from '$lib/utils/ipfs';
  import { CirclesStorage } from '$lib/utils/storage';
  import Safe, { SigningMethod, hashSafeMessage } from '@safe-global/protocol-kit';

  interface Props {
    recipientAddress?: Address;
    onMessageSent?: () => void;
  }

  let { recipientAddress = $bindable(undefined), onMessageSent }: Props = $props();

  let messageText = $state('');
  let isEncrypted = $state(false);

  const DOMAIN = {
    chainId: 100
  };
  // EIP-712 Types for the message structure
  const TYPES = {
    CirclesMessage: [
      { name: 'cid', type: 'string' },
      { name: 'encrypted', type: 'bool' },
      { name: 'encryptionAlgorithm', type: 'string' },
      { name: 'encryptionKeyFingerprint', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'signerAddress', type: 'address' },
      { name: 'signedAt', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  };

  async function signMessageWithSafe(messageData: any): Promise<string> {
    try {
      if (!avatarState.avatar?.address) {
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
      let protocolKit = await Safe.init({
        provider: window.ethereum,
        signer: signer.address,
        safeAddress: avatarState.avatar.address
      });

      // For Safe SDK, we need to create the EIP-712 structured data properly
      // The Safe SDK expects the full EIP712 structure with domain, types, and primaryType

      /*
      protocolKit = await protocolKit.connect({
        provider: window.ethereum,
        signer: signer.address,
        safeAddress: avatarState.avatar.address
      })
      */

      console.log('Safe Protocol Kit initialized')
      const safeAddress = await protocolKit.getAddress();
      console.log('Safe address:', safeAddress)
      const safeContractVersion = await protocolKit.getContractVersion();
      console.log('Safe version:', safeContractVersion)

      // EIP-712 Domain for Circles messaging
      // @todo make it shared

      const eip712Data = {
        domain: DOMAIN,
        types: {
          ...TYPES,
          EIP712Domain: [
            { name: 'chainId', type: 'uint256' },
          ]
        },
        primaryType: 'CirclesMessage',
        message: messageData
      };

      console.log('EIP712 Data:', eip712Data);
      const initialSafeMessage = await protocolKit.createMessage(eip712Data);
      console.log(initialSafeMessage)

      console.log({
        provider: window.ethereum,
        signer: signer.address,
        safeAddress: avatarState.avatar.address
      })

      // Sign the safeMessage with OWNER_1_ADDRESS
      // After this, the safeMessage contains the signature from OWNER_1_ADDRESS
      
      const signedSafeMessage = await protocolKit.signMessage(
        initialSafeMessage,
        SigningMethod.ETH_SIGN_TYPED_DATA_V4,
        safeAddress
      )

      const encodedSignatures = signedSafeMessage.encodedSignatures()
      console.log("encoded signature:", encodedSignatures)

      const safeMessageHash = await protocolKit.getSafeMessageHash(
        hashSafeMessage(eip712Data) // or STRING_MESSAGE
      )
      console.log("safe hash: ", safeMessageHash);
      //Check the validity of the sigature
      const isValid = await protocolKit.isValidSignature(
        hashSafeMessage(eip712Data),//safeMessageHash,
        encodedSignatures
      )
      console.log("is valid: ", isValid)
      // Sign the typed data using Safe SDK
      
      console.log('Signed message:', encodedSignatures);
      throw new Error();
      return encodedSignatures;
      
    } catch (error) {
      console.error('Error signing message with Safe:', error);
      throw new Error(`Failed to sign message with Safe wallet: ${error.message}`);
    }
  }

  async function signMessageWithEOA(messageData: any): Promise<string> {
    try {
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
          signature = await signer._signTypedData(DOMAIN, TYPES, messageData);
        } else if (typeof signer.signTypedData === 'function') {
          signature = await signer.signTypedData(DOMAIN, TYPES, messageData);
        } else {
          // Fallback: create the hash manually and sign it as a message
          const hash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, messageData);
          signature = await signer.signMessage(ethers.getBytes(hash));
        }
      } catch (signingError) {
        console.error('Signing error:', signingError);
        // Final fallback: create the hash and sign as message
        const hash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, messageData);
        signature = await signer.signMessage(ethers.getBytes(hash));
      }
      
      return signature;
    } catch (error) {
      console.error('Error signing message with EOA:', error);
      throw new Error(`Failed to sign message with EOA wallet: ${error.message}`);
    }
  }

  async function createMessageSignature(messageData: any): Promise<string> {
    // Get wallet type from storage (most reliable method)
    const storedWalletType = CirclesStorage.getInstance().walletType;
    const isSafeWallet = storedWalletType?.includes('safe') || false;
    const isCirclesWallet = storedWalletType?.includes('circles') || false;
    
    // Check if the avatar address differs from wallet address (indicates Safe usage)
    const isDifferentAddress = avatarState.avatar?.address !== $wallet?.address?.toLowerCase();

    if (isSafeWallet || isCirclesWallet || isDifferentAddress) {
      // This is a Safe wallet (either directly or through circles wallet acting as safe)
      return await signMessageWithSafe(messageData);
    } else {
      // This is a direct EOA wallet
      return await signMessageWithEOA(messageData);
    }
  }

  async function sendMessage() {
    if (!$circles || !avatarState.avatar?.address || !recipientAddress || !messageText.trim()) {
      throw new Error('Missing required data for sending message');
    }

    if (!ethers.isAddress(recipientAddress)) {
      throw new Error('Invalid recipient address');
    }

    try {
      // Create message content
      const messageContent = {
        txt: messageText.trim()
      };

      // Upload message content to IPFS
      const messageCid = await uploadToIpfs(messageContent);

      // Create the message data structure for signing
      const currentTime = Math.floor(Date.now() / 1000);
      const nonce = isEncrypted ? BigInt(ethers.hexlify(ethers.randomBytes(16))) : BigInt(0);
      
      const messageData = {
        cid: messageCid,
        encrypted: isEncrypted,
        encryptionAlgorithm: isEncrypted ? "AES-256-GCM" : "",
        encryptionKeyFingerprint: isEncrypted ? "placeholder-fingerprint" : "",
        chainId: BigInt(100),
        signerAddress: avatarState.avatar.address.toLowerCase(),
        signedAt: BigInt(currentTime),
        nonce: nonce
      };

      // Create signature for the message
      const signature = await createMessageSignature(messageData);

      // Get current profile
      const currentProfileCid = await $circles.data.getMetadataCidForAddress(avatarState.avatar.address);
      let currentProfile: any = {};
      
      // Fetch profile directly from IPFS
      if (currentProfileCid) {
        currentProfile = await fetchFromIpfs(currentProfileCid, 1000) || {};
      }

      // Initialize namespaces if they don't exist
      if (!currentProfile.namespaces) {
        currentProfile.namespaces = {};
      }

      // Get the recipient's namespace or create it
      const recipientKey = recipientAddress.toLowerCase();
      let recipientNamespaceCid = currentProfile.namespaces[recipientKey];
      let linksData: any = { links: [] };

      if (recipientNamespaceCid) {
        // Load existing links
        linksData = await fetchFromIpfs(recipientNamespaceCid, 1000) || { links: [] };
      }

      // Create new message link with signature
      const newLink = {
        cid: messageCid,
        encrypted: isEncrypted,
        encryptionAlgorithm: messageData.encryptionAlgorithm,
        encryptionKeyFingerprint: messageData.encryptionKeyFingerprint,
        chainId: 100,
        signerAddress: avatarState.avatar.address.toLowerCase(),
        signedAt: currentTime,
        nonce: isEncrypted ? ethers.toBeHex(nonce) : "0x0",
        signature: signature
      };

      // Add new message to links
      linksData.links.push(newLink);

      // Upload updated links to IPFS
      const newNamespaceCid = await uploadToIpfs(linksData, "links.json");

      // Update profile with new namespace CID
      currentProfile.namespaces[recipientKey] = newNamespaceCid;

      // Upload updated profile to IPFS
      const newProfileCid = await uploadToIpfs(currentProfile, "profile.json");

      // Update metadata on-chain
      await avatarState.avatar.updateMetadata(newProfileCid);

      // Reset form
      messageText = '';
      recipientAddress = undefined;
      
      // Call callback and close popup
      onMessageSent?.();
      popupControls.close();

    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  const canSend = $derived(
    recipientAddress && 
    ethers.isAddress(recipientAddress) && 
    messageText.trim().length > 0
  );
</script>

<div class="flex flex-col gap-4 p-6 w-full max-w-md">
  <div class="form-control">
    <label class="label">
      <span class="label-text">To:</span>
    </label>
    <AddressInput bind:address={recipientAddress} />
  </div>

  <div class="form-control">
    <label class="label">
      <span class="label-text">Message:</span>
    </label>
    <textarea
      bind:value={messageText}
      class="textarea textarea-bordered w-full h-32"
      placeholder="Type your message here..."
      maxlength="500"
    ></textarea>
    <label class="label">
      <span class="label-text-alt">{messageText.length}/500</span>
    </label>
  </div>

  <div class="form-control">
    <label class="cursor-pointer label">
      <span class="label-text">Encrypt message</span>
      <input 
        type="checkbox" 
        bind:checked={isEncrypted}
        class="toggle toggle-primary" 
      />
    </label>
    <label class="label">
      <span class="label-text-alt text-gray-500">
        {#if isEncrypted}
          Message will be encrypted (feature in development)
        {:else}
          Message will be stored as plain text
        {/if}
      </span>
    </label>
  </div>

  <div class="flex gap-2 justify-end">
    <button class="btn btn-ghost" onclick={() => popupControls.close()}>
      Cancel
    </button>
    <ActionButton action={sendMessage} disabled={!canSend}>
      Send Message
    </ActionButton>
  </div>
</div>
