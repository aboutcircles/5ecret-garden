<script lang="ts">
  import { onMount } from 'svelte';
  import { contacts } from '$lib/stores/contacts';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { popupControls } from '$lib/stores/popUp';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import WriteMessage from './WriteMessage.svelte';
  import ConversationView from './ConversationView.svelte';
  import { getTimeAgo } from '$lib/utils/shared';
  import { fetchFromIpfs } from '$lib/utils/ipfs';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import Safe, { SigningMethod, hashSafeMessage } from '@safe-global/protocol-kit';

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
    isVerified: boolean; // Add verification status
  }

  interface MessageGroup {
    senderAddress: Address;
    messages: Message[];
    lastMessage: Message;
  }

  let messages: Message[] = $state([]);
  let groupedMessages: MessageGroup[] = $state([]);
  let isLoading = $state(false);

  // EIP-712 Domain for signature verification (same as in WriteMessage)
  const DOMAIN = {
    chainId: 100,
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

  async function verifyMessageSignature(link: any, senderAddress: Address): Promise<boolean> {
    try {
      // Reconstruct the message data that should have been signed
      const messageData = {
        cid: link.cid,
        encrypted: link.encrypted || false,
        encryptionAlgorithm: link.encryptionAlgorithm || "",
        encryptionKeyFingerprint: link.encryptionKeyFingerprint || "",
        chainId: BigInt(link.chainId || 100),
        signerAddress: link.signerAddress?.toLowerCase() || senderAddress.toLowerCase(),
        signedAt: BigInt(link.signedAt),
        nonce: BigInt(link.nonce || 0)
      };

      // Create the EIP-712 hash
      const hash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, messageData);
      const expectedAddress = link.signerAddress?.toLowerCase() || senderAddress.toLowerCase();
      
      try {
        // Method 1: Try Safe signature verification first
        if (window.ethereum) {
          try {
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
              link.signature
            );
            
            if (isValidSafeSignature) {
              console.log('Signature verified using Safe SDK');
              return true;
            }
          } catch (safeError) {
            // Safe verification failed, might not be a Safe wallet
            console.log('Safe signature verification failed:', safeError);
          }
        }

        // Method 2: Try EOA signature verification (fallback for EOA wallets)
        try {
          const recoveredFromTypedData = ethers.verifyTypedData(DOMAIN, TYPES, messageData, link.signature);
          if (recoveredFromTypedData.toLowerCase() === expectedAddress) {
            console.log('Signature verified using EOA typed data method');
            return true;
          }
        } catch (typedDataError) {
          console.log('EOA typed data verification failed:', typedDataError);
        }

        // Method 3: Try message hash recovery (for direct message signatures)
        try {
          const recoveredFromMessage = ethers.verifyMessage(ethers.getBytes(hash), link.signature);
          if (recoveredFromMessage.toLowerCase() === expectedAddress) {
            console.log('Signature verified using message hash recovery');
            return true;
          }
        } catch (messageVerifyError) {
          console.log('Message hash verification failed:', messageVerifyError);
        }

        console.warn(`All verification methods failed for message ${link.cid}`);
        return false;
        
      } catch (verificationError) {
        console.warn(`Signature verification error for message ${link.cid}:`, verificationError);
        return false;
      }
      
    } catch (error) {
      console.warn(`Signature verification failed for message ${link.cid}:`, error);
      return false;
    }
  }

  async function fetchMessages() {
    console.log("fetching msgs", !$circles, avatarState.avatar?.address, !$contacts);
    if (!$circles || !avatarState.avatar?.address || !$contacts) {
      return;
    }

    isLoading = true;
    const allMessages: Message[] = [];

    try {
      // Get all trusted connections
      const trustedAddresses = Object.keys($contacts.data);
      
      // Fetch received messages (messages from contacts to us)
      for (const address of trustedAddresses) {
        try {
          // Get the profile for this contact
          const profileCid = await $circles.data.getMetadataCidForAddress(address as Address);
          if (!profileCid) continue;

          // Fetch profile directly from IPFS
          const profile = await fetchFromIpfs(profileCid, 1000);
          if (!profile?.namespaces) continue;

          // Check if this contact has messages for us
          const ourNamespace = profile.namespaces[avatarState.avatar.address.toLowerCase()];
          if (!ourNamespace) continue;

          // Fetch the links from the namespace directly from IPFS
          const linksData = await fetchFromIpfs(ourNamespace, 1000);
          if (!linksData?.links) continue;

          // Process each message link (received messages)
          for (const link of linksData.links) {
            try {
              // Fetch message content directly from IPFS
              const messageContent = await fetchFromIpfs(link.cid, 1000);
              if (messageContent?.txt) {
                // Verify the signature
                const isVerified = await verifyMessageSignature(link, address as Address);
                
                allMessages.push({
                  txt: messageContent.txt,
                  cid: link.cid,
                  senderAddress: address as Address,
                  encrypted: link.encrypted,
                  signedAt: link.signedAt,
                  signature: link.signature,
                  nonce: link.nonce,
                  chainId: link.chainId,
                  conversationWith: avatarState.avatar.address,
                  isVerified: isVerified
                });
              }
            } catch (err) {
              console.warn(`Failed to fetch message content for CID ${link.cid}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch messages from ${address}:`, err);
        }
      }

      // Fetch sent messages (messages from us to contacts)
      try {
        // Get our own profile
        const ourProfileCid = await $circles.data.getMetadataCidForAddress(avatarState.avatar.address);
        if (ourProfileCid) {
          const ourProfile = await fetchFromIpfs(ourProfileCid, 2000);
          if (ourProfile?.namespaces) {
            // Check each contact's namespace in our profile for sent messages
            for (const contactAddress of trustedAddresses) {
              const contactNamespace = ourProfile.namespaces[contactAddress.toLowerCase()];
              if (!contactNamespace) continue;

              // Fetch the links from our namespace for this contact
              const sentLinksData = await fetchFromIpfs(contactNamespace, 2000);
              if (!sentLinksData?.links) continue;

              // Process each sent message link
              for (const link of sentLinksData.links) {
                try {
                  // Fetch message content directly from IPFS
                  const messageContent = await fetchFromIpfs(link.cid, 2000);
                  if (messageContent?.txt) {
                    // Verify the signature (our own message)
                    const isVerified = await verifyMessageSignature(link, messageContent, avatarState.avatar.address);
                    
                    allMessages.push({
                      txt: messageContent.txt,
                      cid: link.cid,
                      senderAddress: avatarState.avatar.address,
                      encrypted: link.encrypted,
                      signedAt: link.signedAt,
                      signature: link.signature,
                      nonce: link.nonce,
                      chainId: link.chainId,
                      conversationWith: contactAddress as Address,
                      isVerified: isVerified
                    });
                  }
                } catch (err) {
                  console.warn(`Failed to fetch sent message content for CID ${link.cid}:`, err);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch sent messages:', err);
      }

      // Sort messages by signedAt (newest first)
      allMessages.sort((a, b) => b.signedAt - a.signedAt);
      messages = allMessages;

      // Group messages by conversation partner
      const grouped = new Map<Address, Message[]>();
      for (const message of allMessages) {
        // Determine the conversation partner
        const conversationPartner = message.senderAddress === avatarState.avatar.address 
          ? message.conversationWith!
          : message.senderAddress;
        
        if (!grouped.has(conversationPartner)) {
          grouped.set(conversationPartner, []);
        }
        grouped.get(conversationPartner)!.push(message);
      }

      // Convert to array and sort by last message time
      groupedMessages = Array.from(grouped.entries())
        .map(([contactAddress, msgs]) => ({
          senderAddress: contactAddress,
          messages: msgs.sort((a, b) => b.signedAt - a.signedAt),
          lastMessage: msgs.sort((a, b) => b.signedAt - a.signedAt)[0]
        }))
        .sort((a, b) => b.lastMessage.signedAt - a.lastMessage.signedAt);

    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      isLoading = false;
    }
  }

  function openWriteMessage() {
    popupControls.open({
      title: 'Write Message',
      component: WriteMessage,
      props: {
        onMessageSent: () => {
          // Refresh messages after sending
          setTimeout(() => fetchMessages(), 1000);
        }
      }
    });
  }

  function openConversation(contactAddress: Address) {
    // Get all messages for this conversation (both sent and received)
    const conversationMessages = messages.filter(msg => {
      // Messages from contact to us
      if (msg.senderAddress === contactAddress) {
        return true;
      }
      // Messages from us to contact
      if (msg.senderAddress === avatarState.avatar?.address && 
          msg.conversationWith === contactAddress) {
        return true;
      }
      return false;
    });

    popupControls.open({
      title: 'Conversation',
      component: ConversationView,
      props: {
        contactAddress,
        messages: conversationMessages,
        currentUserAddress: avatarState.avatar?.address
      }
    });
  }

  onMount(async () => {
    await fetchMessages();
  });
</script>

<div class="flex flex-col w-full sm:w-[90%] lg:w-3/5 gap-y-5 mt-28 mb-10 text-[#161616]">
  <div class="flex justify-between items-center">
    <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Inbox</div>
    <div class="flex gap-x-2">
      <ActionButton action={fetchMessages} disabled={isLoading}>
        {#if isLoading}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          <img src="/update.svg" alt="Refresh" class="w-4 h-4 inline invert" />
        {/if}
        Refresh
      </ActionButton>
      <button class="btn btn-primary text-white" onclick={openWriteMessage}>
        <img src="/envelope.svg" alt="Write" class="w-4 h-4 inline invert" />
        Write Message
      </button>
    </div>
  </div>

  {#if isLoading && messages.length === 0}
    <div class="flex justify-center items-center h-32">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="ml-2">Loading messages...</span>
    </div>
  {:else if groupedMessages.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-500">No messages yet</p>
      <p class="text-sm text-gray-400">Messages from your trusted connections will appear here</p>
    </div>
  {:else}
    <div class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y">
      {#each groupedMessages as group (group.senderAddress)}
        <button
          class="w-full flex items-center justify-between p-4 hover:bg-black/5 rounded-lg"
          onclick={() => openConversation(group.senderAddress)}
        >
          <div class="flex items-center flex-1">
            <Avatar
              address={group.senderAddress}
              view="horizontal"
              clickable={false}
              bottomInfo={getTimeAgo(group.lastMessage.signedAt)}
            />
          </div>
          <div class="flex flex-col items-end ml-4 max-w-xs">
            <div class="flex items-center gap-x-2">
              <span class="badge badge-primary badge-sm">{group.messages.length}</span>
              {#if group.lastMessage.encrypted}
                <img src="/lock.svg" alt="Encrypted" class="w-3 h-3" />
              {/if}
            </div>
            <p class="text-sm text-gray-600 truncate mt-1 max-w-full">
              {group.lastMessage.txt}
            </p>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>