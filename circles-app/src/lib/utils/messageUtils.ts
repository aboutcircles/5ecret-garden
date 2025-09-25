import { ethers } from 'ethers';
import type { Address } from '@circles-sdk/utils';
import type { Message, MessageData, MessageGroup, MessageLink, NameIndexDoc, NamespaceChunk } from './messageTypes';
import { verifyMessageSignature, createMessageSignature } from './messageSignature';
import { uploadToIpfs, fetchFromIpfs } from './ipfs';
import { circles } from '$lib/stores/circles';
import { avatarState } from '$lib/stores/avatar.svelte';
import { contacts } from '$lib/stores/contacts';
import { get } from 'svelte/store';

/**
 * Helper function to traverse namespace chunks and collect all message links
 * According to spec: head always points to the latest chunk, traverse via prev links
 */
async function traverseNamespaceChunks(nameIndexDoc: NameIndexDoc): Promise<MessageLink[]> {
  const allLinks: MessageLink[] = [];

  // Always start from head (latest chunk) as per spec
  let currentChunkCid = nameIndexDoc.head;

  // Traverse the entire chunk chain from latest to oldest
  while (currentChunkCid) {
    try {
      const chunk = await fetchFromIpfs(currentChunkCid) as NamespaceChunk;
      if (!chunk?.links) break;

      // Add all links from this chunk
      allLinks.push(...chunk.links);

      // Move to previous chunk via prev link
      currentChunkCid = chunk.prev || null;
    } catch (err) {
      console.warn(`Failed to fetch chunk ${currentChunkCid}:`, err);
      break;
    }
  }

  return allLinks;
}

/**
 * Helper function to process message links and create Message objects
 */
async function processMessageLinks(
  links: MessageLink[],
  senderAddress: Address,
  conversationWith?: Address
): Promise<Message[]> {
  const messages: Message[] = [];

  for (const link of links) {
    try {
      // Fetch message content from IPFS
      const messageContent = await fetchFromIpfs(link.cid);
      if (messageContent?.txt) {
        const message: Message = {
          name: link.name,
          txt: messageContent.txt,
          cid: link.cid,
          senderAddress,
          conversationWith,
          encrypted: link.encrypted || false,
          signedAt: link.signedAt || 0,
          signature: link.signature || '',
          nonce: link.nonce || '0x0',
          chainId: link.chainId || 100,
          isVerified: false // Will be verified later
        };
        messages.push(message);
      }
    } catch (err) {
      console.warn(`Failed to fetch message content for CID ${link.cid}:`, err);
    }
  }

  return messages;
}

/**
 * Helper function to fetch messages from a single contact's namespace
 */
async function fetchMessagesFromContact(
  profileOwner: Address,
  namespaceKey: Address
): Promise<Message[]> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  if (!sdk.data) throw new Error('No sdk.data instance found. Is the data service url configured?');

  try {
    // Get the profile CID for the profile owner
    const profileCid = await sdk.data.getMetadataCidForAddress(profileOwner);
    if (!profileCid) return [];

    // Fetch profile from IPFS
    const profile = await fetchFromIpfs(profileCid);
    if (!profile?.namespaces) return [];

    // Get the namespace for the specified key
    const namespaceIndexCid = profile.namespaces[namespaceKey.toLowerCase()];
    if (!namespaceIndexCid) return [];

    // Fetch the namespace index (spec format - only head and entries)
    const nameIndexDoc = await fetchFromIpfs(namespaceIndexCid) as NameIndexDoc;
    if (!nameIndexDoc?.head) return [];

    // Traverse namespace chunks to get all message links (links are ONLY in chunks, never in index)
    const allLinks = await traverseNamespaceChunks(nameIndexDoc);

    // Process message links into Message objects
    // For received messages: profileOwner (contact) is sender, namespaceKey (our address) is conversation partner
    // For sent messages: profileOwner (our address) is sender, namespaceKey (contact) is conversation partner
    const senderAddr = profileOwner;
    const conversationAddr = namespaceKey;

    return await processMessageLinks(allLinks, senderAddr, conversationAddr);
  } catch (err) {
    console.warn(`Failed to fetch messages from ${profileOwner} for ${namespaceKey}:`, err);
    return [];
  }
}

/**
 * Helper function to determine next message number for a recipient based on the largest message index
 */
async function getNextMessageNumber(
  senderAddress: Address,
  recipientAddress: Address
): Promise<number> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  if (!sdk.data) throw new Error('No sdk.data instance found. Is the data service url configured?');

  try {
    const currentProfileCid = await sdk.data.getMetadataCidForAddress(senderAddress);
    if (currentProfileCid) {
      const currentProfile = await fetchFromIpfs(currentProfileCid) || {};
      if (currentProfile.namespaces) {
        const recipientKey = recipientAddress.toLowerCase();
        const oldNameIndexCid = currentProfile.namespaces[recipientKey];

        if (oldNameIndexCid) {
          const oldNamespaceData = await fetchFromIpfs(oldNameIndexCid);
          if (oldNamespaceData?.entries) {
            const existingMsgKeys = Object.keys(oldNamespaceData.entries).filter(key => key.startsWith('msg-'));
            if (existingMsgKeys.length > 0) {
              const msgNumbers = existingMsgKeys
                .map(key => {
                  const match = key.match(/^msg-(\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                })
                .filter(num => num > 0);

              if (msgNumbers.length > 0) {
                return Math.max(...msgNumbers) + 1;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to determine next message number, using 1:', err);
  }
  return 1;
}

/**
 * Groups messages by conversation partner
 */
export function groupMessagesByConversation(
  messages: Message[],
  currentUserAddress: Address
): MessageGroup[] {
  const grouped = new Map<Address, Message[]>();

  for (const message of messages) {
    // Determine the conversation partner
    const conversationPartner = message.senderAddress === currentUserAddress
      ? message.conversationWith!
      : message.senderAddress;

    if (!grouped.has(conversationPartner)) {
      grouped.set(conversationPartner, []);
    }
    grouped.get(conversationPartner)!.push(message);
  }

  // Convert to array and sort by last message time
  return Array.from(grouped.entries())
    .map(([contactAddress, msgs]) => ({
      senderAddress: contactAddress,
      messages: msgs.sort((a, b) => b.signedAt - a.signedAt),
      lastMessage: msgs.sort((a, b) => b.signedAt - a.signedAt)[0]
    }))
    .sort((a, b) => b.lastMessage.signedAt - a.lastMessage.signedAt);
}

/**
 * Fetches messages from contacts with signature verification
 */
export async function fetchMessagesFromContacts(
  avatarAddress: Address,
  trustedAddresses: Address[]
): Promise<Message[]> {
  const receivedMessages: Message[] = [];

  for (const contactAddress of trustedAddresses) {
    const messages = await fetchMessagesFromContact(
      contactAddress, // Profile owner (contact)
      avatarAddress   // Namespace key (our address in their profile)
    );
    receivedMessages.push(...messages);
  }

  return receivedMessages;
}

/**
 * Fetches sent messages with signature verification
 */
export async function fetchSentMessages(
  avatarAddress: Address,
  trustedAddresses: Address[]
): Promise<Message[]> {
  const sentMessages: Message[] = [];

  for (const contactAddress of trustedAddresses) {
    const messages = await fetchMessagesFromContact(
      avatarAddress, // Profile owner (our profile)
      contactAddress // Namespace key (contact's address in our profile)
    );
    sentMessages.push(...messages);
  }

  return sentMessages;
}

/**
 * Uploads a message and updates the sender's profile
 */
export async function uploadMessageAndUpdateProfile(
  senderAddress: Address,
  recipientAddress: Address,
  messageContent: any,
  messageLink: MessageLink
): Promise<void> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  if (!sdk.data) throw new Error('No sdk.data instance found. Is the data service url configured?');

  try {
    // Step 1: Upload message content to IPFS
    const messageCid = await uploadToIpfs(messageContent, 'message.json');
    
    // Update the link with the actual CID
    messageLink.cid = messageCid;

    // Step 2: Get current profile
    const currentProfileCid = await sdk.data.getMetadataCidForAddress(senderAddress);
    console.log("Current profile CID:", currentProfileCid);
    let currentProfile: any = {};
    
    if (currentProfileCid) {
      currentProfile = await fetchFromIpfs(currentProfileCid) || {};
    }

    // Step 3: Initialize namespaces if they don't exist
    if (!currentProfile.namespaces) {
      currentProfile.namespaces = {};
    }

    // Step 4: Reconstruct namespace index from scratch (erase old format completely)
    const recipientKey = recipientAddress.toLowerCase();
    const oldNameIndexCid = currentProfile.namespaces[recipientKey];

    // Start with a completely fresh namespace index - only head and entries as per spec
    const newNameIndexDoc: NameIndexDoc = {
      head: "",
      entries: {}
    };

    let currentTailChunk: NamespaceChunk | null = null;
    let currentTailCid: string | null = null;

    // If there's an existing namespace, preserve only the valid entries and head
    if (oldNameIndexCid) {
      const oldNamespaceData = await fetchFromIpfs(oldNameIndexCid);

      if (oldNamespaceData) {
        // Only preserve head and entries, ignore any other legacy fields
        if (oldNamespaceData.head) {
          newNameIndexDoc.head = oldNamespaceData.head;
        }
        if (oldNamespaceData.entries && typeof oldNamespaceData.entries === 'object') {
          // Only preserve valid entries (no links or other legacy fields)
          newNameIndexDoc.entries = { ...oldNamespaceData.entries };
        }

        // Head always points to the newest chunk - this is where we add new messages
        if (newNameIndexDoc.head) {
          try {
            currentTailChunk = await fetchFromIpfs(newNameIndexDoc.head) as NamespaceChunk;
            currentTailCid = newNameIndexDoc.head;
          } catch (err) {
            console.warn(`Failed to fetch head chunk ${newNameIndexDoc.head}:`, err);
          }
        }
      }
    }

    // Step 5: Handle chunk rotation (max 100 links per chunk)
    let activeChunk: NamespaceChunk;
    let activeChunkCid: string;

    if (!currentTailChunk || currentTailChunk.links.length >= 100) {
      // Need to create a new chunk (either first chunk or current one is full)
      activeChunk = {
        prev: currentTailCid, // Points to the previous head (or null for first chunk)
        links: [messageLink]
      };

      // Upload the new chunk
      activeChunkCid = await uploadToIpfs(activeChunk, 'chunk.json');

      // Update head to point to the new chunk (head always points to newest)
      newNameIndexDoc.head = activeChunkCid;
    } else {
      // Current chunk has space - add message to existing chunk
      activeChunk = {
        ...currentTailChunk,
        links: [...currentTailChunk.links, messageLink]
      };

      // Upload the updated chunk (same CID reference in head)
      activeChunkCid = await uploadToIpfs(activeChunk, 'chunk.json');

      // Head stays the same since we're just updating the current head chunk
      newNameIndexDoc.head = activeChunkCid;
    }

    // Step 6: Use the pre-determined name from the message link (already set in sendMessage)
    const uniqueMsgName = messageLink.name;

    // Step 7: Update entry for this specific message to point to the chunk containing it
    newNameIndexDoc.entries[uniqueMsgName] = activeChunkCid;

    // Step 8: Update entries for ALL messages in the current active chunk
    // (since the chunk CID changed, all messages in it need updated entries)
    if (activeChunk && activeChunk.links) {
      for (const link of activeChunk.links) {
        if (link.name) {
          newNameIndexDoc.entries[link.name] = activeChunkCid;
        }
      }
    }

    // Step 7: Upload completely reconstructed namespace index to IPFS
    const newNamespaceIndexCid = await uploadToIpfs(newNameIndexDoc, 'namespace-index.json');

    // Step 9: Update profile with new namespace index CID and ensure schema version
    currentProfile.namespaces[recipientKey] = newNamespaceIndexCid;

    // Ensure profile has correct schema version as per spec
    currentProfile.schemaVersion = "1.2";

    // Step 10: Upload updated profile to IPFS
    const newProfileCid = await uploadToIpfs(currentProfile, 'profile.json');
    console.log("New profile CID:", newProfileCid);
    // Step 11: Update metadata on-chain
    const avatar = await circlesInstance.getAvatar(senderAddress);
    await avatar.updateMetadata(newProfileCid);

  } catch (error) {
    console.error('Failed to upload message and update profile:', error);
    throw error;
  }
}

/**
 * Fetches all messages (received and sent) with signature verification
 */
export async function fetchAllMessages(): Promise<Message[]> {
  const $circles = get(circles);
  const $contacts = get(contacts);

  if (!$circles || !avatarState.avatar?.address || !$contacts) {
    return [];
  }

  const allMessages: Message[] = [];

  try {
    // Get all trusted connections
    const trustedAddresses = Object.keys($contacts.data);
    
    // Fetch received and sent messages
    const [receivedMessages, sentMessages] = await Promise.all([
      fetchMessagesFromContacts(avatarState.avatar.address, trustedAddresses as Address[]),
      fetchSentMessages(avatarState.avatar.address, trustedAddresses as Address[])
    ]);

    // Combine all messages
    allMessages.push(...receivedMessages, ...sentMessages);

    // Verify signatures for all messages
    for (const message of allMessages) {
      if (message.signature) {
        const link: MessageLink = {
          name: message.name,
          cid: message.cid,
          encrypted: message.encrypted,
          encryptionAlgorithm: message.encrypted ? "AES-256-GCM" : "",
          encryptionKeyFingerprint: message.encrypted ? "placeholder-fingerprint" : "",
          chainId: message.chainId,
          signerAddress: message.senderAddress.toLowerCase(),
          signedAt: message.signedAt,
          nonce: message.nonce,
          signature: message.signature
        };
        message.isVerified = await verifyMessageSignature(link, message.senderAddress);
      } else {
        message.isVerified = false;
      }
    }

    return allMessages;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }
}

/**
 * Sends a message to a recipient with proper signing
 */
export async function sendMessage(
  recipientAddress: Address,
  messageText: string,
  isEncrypted: boolean = false
): Promise<void> {
  const $circles = get(circles);

  if (!$circles || !avatarState.avatar?.address || !recipientAddress || !messageText.trim()) {
    throw new Error('Missing required data for sending message');
  }

  if (!ethers.isAddress(recipientAddress)) {
    throw new Error('Invalid recipient address');
  }

  try {
    // Step 1: Create message content
    const messageContent = {
      txt: messageText.trim()
    };

    // Step 2: Upload message content to IPFS first
    const messageCid = await uploadToIpfs(messageContent, 'message.json');

    // Step 3: Determine message name for signing
    const nextMsgNumber = await getNextMessageNumber(avatarState.avatar.address, recipientAddress);
    const uniqueMsgName = `msg-${nextMsgNumber}`;

    // Step 4: Create the message data structure for signing (including name)
    const currentTime = Math.floor(Date.now() / 1000);
    const nonceHex = ethers.hexlify(ethers.randomBytes(16)); // 32 hex chars after 0x

    const messageData: MessageData = {
      name: uniqueMsgName,
      cid: messageCid, // Now we have the actual CID from IPFS
      encrypted: isEncrypted,
      encryptionAlgorithm: isEncrypted ? "AES-256-GCM" : "",
      encryptionKeyFingerprint: isEncrypted ? "placeholder-fingerprint" : "",
      chainId: BigInt(100),
      signerAddress: avatarState.avatar.address.toLowerCase(),
      signedAt: BigInt(currentTime),
      nonce: nonceHex
    };

    // Step 4: Create signature for the message
    const signature = await createMessageSignature(messageData);

    // Step 5: Create new message link with signature and determined name
    const newLink: MessageLink = {
      name: uniqueMsgName,
      cid: messageCid,
      encrypted: isEncrypted,
      encryptionAlgorithm: messageData.encryptionAlgorithm,
      encryptionKeyFingerprint: messageData.encryptionKeyFingerprint,
      chainId: Number(messageData.chainId),
      signerAddress: avatarState.avatar.address.toLowerCase(),
      signedAt: Number(messageData.signedAt),
      nonce: nonceHex,
      signature: signature
    };

    // Step 6: Upload message and update profile (this will handle the rest)
    await uploadMessageAndUpdateProfile(
      avatarState.avatar.address,
      recipientAddress,
      messageContent, // This will be uploaded again, but that's ok for consistency
      newLink
    );

  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Gets conversation messages between current user and a contact
 */
export function getConversationMessages(
  allMessages: Message[],
  contactAddress: Address,
  currentUserAddress: Address
): Message[] {
  return allMessages.filter(msg => {
    // Messages from contact to us
    if (msg.senderAddress === contactAddress) {
      return true;
    }
    // Messages from us to contact
    if (msg.senderAddress === currentUserAddress && 
        msg.conversationWith === contactAddress) {
      return true;
    }
    return false;
  });
}

/**
 * Sorts messages chronologically
 */
export function sortMessages(messages: Message[]): Message[] {

  // Then sort chronologically (oldest first for conversation view)
  return messages.sort((a, b) => a.signedAt - b.signedAt);
}

/**
 * DEBUG HELPER: Removes all sent messages by clearing all namespaces from user's profile
 * WARNING: This will permanently delete all message history for this user!
 */
export async function debugClearAllSentMessages(): Promise<void> {
  const $circles = get(circles);

  if (!$circles || !avatarState.avatar?.address) {
    throw new Error('No circles instance or avatar address available');
  }

  try {
    console.warn('🚨 DEBUG: Clearing all sent messages for user:', avatarState.avatar.address);

    // Step 1: Get current profile
    const currentProfileCid = await $circles.data.getMetadataCidForAddress(avatarState.avatar.address);
    let currentProfile: any = {};

    if (currentProfileCid) {
      currentProfile = await fetchFromIpfs(currentProfileCid) || {};
    }

    // Step 2: Clear all namespaces but keep other profile data
    const clearedProfile = {
      ...currentProfile,
      namespaces: {}, // Clear all namespaces (removes all sent messages)
      schemaVersion: "1.2" // Ensure correct schema version
    };

    console.warn('🚨 DEBUG: Profile before clearing:', {
      namespacesCount: Object.keys(currentProfile.namespaces || {}).length,
      namespaces: Object.keys(currentProfile.namespaces || {})
    });

    // Step 3: Upload cleared profile to IPFS
    const newProfileCid = await uploadToIpfs(clearedProfile, 'profile.json');
    console.warn('🚨 DEBUG: Cleared profile uploaded with CID:', newProfileCid);

    // Step 4: Update metadata on-chain
    const avatar = await $circles.getAvatar(avatarState.avatar.address);
    await avatar.updateMetadata(newProfileCid);

    console.warn('✅ DEBUG: All sent messages cleared successfully!');

  } catch (error) {
    console.error('❌ DEBUG: Failed to clear sent messages:', error);
    throw error;
  }
}