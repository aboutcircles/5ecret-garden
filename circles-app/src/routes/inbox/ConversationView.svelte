<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { getTimeAgo } from '$lib/utils/shared';
  import { popupControls } from '$lib/stores/popUp';
  import WriteMessage from './WriteMessage.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import Safe, { hashSafeMessage } from '@safe-global/protocol-kit';

  interface Message {
    txt: string;
    cid: string;
    senderAddress: Address;
    encrypted: boolean;
    signedAt: number;
    signature: string;
    nonce: string;
    chainId: number;
    conversationWith?: Address;
    isVerified: boolean;
  }

  interface Props {
    contactAddress: Address;
    messages: Message[];
    currentUserAddress?: Address;
  }

  let { contactAddress, messages, currentUserAddress }: Props = $props();

  // EIP-712 Domain for signature verification (same as in WriteMessage)
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

  async function verifyMessageSignature(message: Message): Promise<boolean> {
    try {
      // For messages without signature info, mark as unverified
      if (!message.signature) {
        return false;
      }
      console.log("msg to verify: ", message)
      // Reconstruct the message data that should have been signed
      const messageData = {
        cid: message.cid,
        encrypted: message.encrypted || false,
        encryptionAlgorithm: "",
        encryptionKeyFingerprint: "",
        chainId: BigInt(message.chainId || 100),
        signerAddress: message.senderAddress.toLowerCase(),
        signedAt: BigInt(message.signedAt),
        nonce: BigInt(message.nonce || 0)
      };

      // Create the EIP-712 hash
      const hash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, messageData);
      const expectedAddress = message.senderAddress.toLowerCase();
      
      // Method 1: Try Safe signature verification first
      try {
        if (window.ethereum) {
          const protocolKit = await Safe.init({
            provider: window.ethereum,
            safeAddress: expectedAddress
          });

          // For Safe SDK, we need to create the EIP712 structure
          const eip712Data = {
            domain: {
              chainId: 100,
            },
            types: {
              ...TYPES,
              EIP712Domain: [
                { name: 'chainId', type: 'uint256' },
              ]
            },
            primaryType: 'CirclesMessage',
            message: messageData
          };
          
          // Verify using Safe SDK
          const isValidSafeSignature = await protocolKit.isValidSignature(
            hashSafeMessage(eip712Data),
            message.signature
          );
          
          if (isValidSafeSignature) {
            console.log('Signature verified using Safe SDK');
            return true;
          }
        }
      } catch (safeError) {
        // Safe verification failed, might not be a Safe wallet
        console.log('Safe signature verification failed:', safeError);
      }
      console.log("we are here:")
      // Method 2: Try EOA signature verification (fallback for EOA wallets)
      try {
        console.log("but not here:")

        const recoveredFromTypedData = ethers.verifyTypedData(DOMAIN, TYPES, messageData, message.signature);
        console.log(recoveredFromTypedData, expectedAddress);
        if (recoveredFromTypedData.toLowerCase() === expectedAddress) {
          console.log('Signature verified using EOA typed data method');
          return true;
        }
      } catch (typedDataError) {
        console.log('EOA typed data verification failed:', typedDataError);
      }

      // Method 3: Try message hash recovery (for direct message signatures)
      try {
        const recoveredFromMessage = ethers.verifyMessage(ethers.getBytes(hash), message.signature);
        if (recoveredFromMessage.toLowerCase() === expectedAddress) {
          console.log('Signature verified using message hash recovery');
          return true;
        }
      } catch (messageVerifyError) {
        console.log('Message hash verification failed:', messageVerifyError);
      }

      console.warn(`All verification methods failed for message ${message.cid}`);
      return false;
      
    } catch (error) {
      console.warn(`Signature verification failed for message ${message.cid}:`, error);
      return false;
    }
  }

  // Sort messages chronologically (oldest first for conversation view) and ensure uniqueness by CID
  let sortedMessages = $derived((() => {
    // Remove duplicates by CID first
    const uniqueMessages = messages.reduce((acc, message) => {
      if (!acc.find(m => m.cid === message.cid)) {
        acc.push(message);
      }
      return acc;
    }, [] as Message[]);
    
    // Then sort chronologically
    return uniqueMessages.sort((a, b) => a.signedAt - b.signedAt);
  })());

  // Count unverified messages
  let unverifiedCount = $derived(messages.filter(msg => !msg.isVerified).length);

  function replyToContact() {
    popupControls.open({
      title: 'Reply',
      component: WriteMessage,
      props: {
        recipientAddress: contactAddress,
        onMessageSent: () => {
          // Could refresh conversation here
        }
      }
    });
  }

  function isMessageFromCurrentUser(message: Message): boolean {
    return currentUserAddress && message.senderAddress === currentUserAddress;
  }

  // Verify signatures for all messages when component loads
  /*$effect(() => {
    if (messages.length > 0) {
      messages.forEach(async (message) => {
        if (message.isVerified === undefined) {
          const verified = await verifyMessageSignature(message);
          message.isVerified = verified;
        }
      });
    }
  });*/
</script>

<div class="flex flex-col w-full max-w-2xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b">
    <div class="flex items-center gap-x-2">
      <Avatar 
        address={contactAddress}
        view="horizontal"
        clickable={false}
      />
    </div>
    <button class="btn btn-primary btn-sm" onclick={replyToContact}>
      <img src="/arrow-uturn-left.svg" alt="Reply" class="w-4 h-4 invert" />
      Reply
    </button>
  </div>

  <!-- Messages -->
  <div class="flex flex-col gap-3 p-4 max-h-96 overflow-y-auto">
    {#if sortedMessages.length === 0}
      <div class="text-center text-gray-500 py-8">
        No messages in this conversation
      </div>
    {:else}
      {#each sortedMessages as message (message.cid + '-' + message.signedAt)}
        <div class="flex flex-col">
          <div class="chat {isMessageFromCurrentUser(message) ? 'chat-end' : 'chat-start'}">
            <div class="chat-header">
              <span class="text-xs opacity-70">
                {isMessageFromCurrentUser(message) ? 'You' : 'Them'}
              </span>
              <time class="text-xs opacity-50 ml-2">
                {getTimeAgo(message.signedAt)}
              </time>
              {#if message.encrypted}
                <div class="badge badge-warning badge-xs ml-2">
                  <img src="/lock.svg" alt="Encrypted" class="w-2 h-2 mr-1" />
                  Encrypted
                </div>
              {/if}
            </div>
            <div class="chat-bubble {isMessageFromCurrentUser(message) ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'}">
              {message.txt}
            </div>
            <div class="chat-footer opacity-50">
              <span class="text-xs font-mono">CID: {message.cid.slice(0, 12)}...</span>
              {#if !message.isVerified}
                <span class="text-xs text-yellow-600 ml-2">⚠ Signature invalid</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer with message info -->
  <div class="border-t p-4 bg-base-100">
    <div class="text-xs text-gray-500 text-center">
      {sortedMessages.length} message{sortedMessages.length !== 1 ? 's' : ''} in this conversation
      {#if unverifiedCount > 0}
        <span class="text-yellow-600 ml-2">
          • {unverifiedCount} unverified message{unverifiedCount !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>
    {#if unverifiedCount > 0}
      <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <div class="flex items-center gap-1">
          <span class="font-semibold">Security Warning:</span>
        </div>
        <div class="mt-1">
          Some messages in this conversation could not be verified. They may have been tampered with or sent by someone impersonating the sender. Exercise caution with unverified messages.
        </div>
      </div>
    {/if}
  </div>
</div>