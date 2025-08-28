import { ethers } from 'ethers';
import type { Address } from '@circles-sdk/utils';
import type { Message, MessageData, MessageGroup, MessageLink } from './messageTypes';
import { verifyMessageSignature, createMessageSignature } from './messageSignature';
import { uploadToIpfs, fetchFromIpfs } from './ipfs';
import { circles } from '$lib/stores/circles';
import { avatarState } from '$lib/stores/avatar.svelte';
import { contacts } from '$lib/stores/contacts';
import { get } from 'svelte/store';

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
  circlesInstance: any,
  avatarAddress: Address,
  trustedAddresses: Address[]
): Promise<Message[]> {
  const receivedMessages: Message[] = [];

  for (const contactAddress of trustedAddresses) {
    try {
      // Get the profile CID for this contact
      const profileCid = await circlesInstance.data.getMetadataCidForAddress(contactAddress);
      if (!profileCid) continue;

      // Fetch profile from IPFS
      const profile = await fetchFromIpfs(profileCid);
      if (!profile?.namespaces) continue;

      // Check if this contact has messages for us
      const ourNamespace = profile.namespaces[avatarAddress.toLowerCase()];
      if (!ourNamespace) continue;

      // Fetch the links from the namespace
      const linksData = await fetchFromIpfs(ourNamespace);
      if (!linksData?.links) continue;

      // Process each message link
      for (const link of linksData.links) {
        try {
          // Fetch message content from IPFS
          const messageContent = await fetchFromIpfs(link.cid);
          if (messageContent?.txt) {
            const message: Message = {
              txt: messageContent.txt,
              cid: link.cid,
              senderAddress: contactAddress,
              conversationWith: avatarAddress,
              encrypted: link.encrypted || false,
              signedAt: link.signedAt || 0,
              signature: link.signature || '',
              nonce: link.nonce || '0x0',
              chainId: link.chainId || 100,
              isVerified: false // Will be verified later
            };
            receivedMessages.push(message);
          }
        } catch (err) {
          console.warn(`Failed to fetch message content for CID ${link.cid}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch messages from ${contactAddress}:`, err);
    }
  }

  return receivedMessages;
}

/**
 * Fetches sent messages with signature verification
 */
export async function fetchSentMessages(
  circlesInstance: any,
  avatarAddress: Address,
  trustedAddresses: Address[]
): Promise<Message[]> {
  const sentMessages: Message[] = [];

  try {
    // Get our own profile CID
    const ourProfileCid = await circlesInstance.data.getMetadataCidForAddress(avatarAddress);
    if (!ourProfileCid) return sentMessages;

    // Fetch our profile from IPFS
    const ourProfile = await fetchFromIpfs(ourProfileCid);
    if (!ourProfile?.namespaces) return sentMessages;

    // Check each contact's namespace in our profile for sent messages
    for (const contactAddress of trustedAddresses) {
      const contactNamespace = ourProfile.namespaces[contactAddress.toLowerCase()];
      if (!contactNamespace) continue;

      try {
        // Fetch the links from our namespace for this contact
        const sentLinksData = await fetchFromIpfs(contactNamespace);
        if (!sentLinksData?.links) continue;

        // Process each sent message link
        for (const link of sentLinksData.links) {
          try {
            // Fetch message content from IPFS
            const messageContent = await fetchFromIpfs(link.cid);
            if (messageContent?.txt) {
              const message: Message = {
                txt: messageContent.txt,
                cid: link.cid,
                senderAddress: avatarAddress, // We are the sender
                conversationWith: contactAddress,
                encrypted: link.encrypted || false,
                signedAt: link.signedAt || 0,
                signature: link.signature || '',
                nonce: link.nonce || '0x0',
                chainId: link.chainId || 100,
                isVerified: false // Will be verified later
              };
              sentMessages.push(message);
            }
          } catch (err) {
            console.warn(`Failed to fetch sent message content for CID ${link.cid}:`, err);
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch sent messages for contact ${contactAddress}:`, err);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch sent messages:', err);
  }

  return sentMessages;
}

/**
 * Uploads a message and updates the sender's profile
 */
export async function uploadMessageAndUpdateProfile(
  circlesInstance: any,
  senderAddress: Address,
  recipientAddress: Address,
  messageContent: any,
  messageLink: MessageLink
): Promise<void> {
  try {
    // Step 1: Upload message content to IPFS
    const messageCid = await uploadToIpfs(messageContent, 'message.json');
    
    // Update the link with the actual CID
    messageLink.cid = messageCid;

    // Step 2: Get current profile
    const currentProfileCid = await circlesInstance.data.getMetadataCidForAddress(senderAddress);
    let currentProfile: any = {};
    
    if (currentProfileCid) {
      currentProfile = await fetchFromIpfs(currentProfileCid) || {};
    }

    // Step 3: Initialize namespaces if they don't exist
    if (!currentProfile.namespaces) {
      currentProfile.namespaces = {};
    }

    // Step 4: Get the recipient's namespace or create it
    const recipientKey = recipientAddress.toLowerCase();
    let recipientNamespaceCid = currentProfile.namespaces[recipientKey];
    let linksData: any = { links: [] };

    if (recipientNamespaceCid) {
      linksData = await fetchFromIpfs(recipientNamespaceCid) || { links: [] };
      if (!linksData.links) {
        linksData.links = [];
      }
    }

    // Step 5: Add new message link
    linksData.links.push(messageLink);

    // Step 6: Upload updated links to IPFS
    const newNamespaceCid = await uploadToIpfs(linksData, 'links.json');

    // Step 7: Update profile with new namespace CID
    currentProfile.namespaces[recipientKey] = newNamespaceCid;

    // Step 8: Upload updated profile to IPFS
    const newProfileCid = await uploadToIpfs(currentProfile, 'profile.json');

    // Step 9: Update metadata on-chain
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
      fetchMessagesFromContacts($circles, avatarState.avatar.address, trustedAddresses),
      fetchSentMessages($circles, avatarState.avatar.address, trustedAddresses)
    ]);

    // Combine all messages
    allMessages.push(...receivedMessages, ...sentMessages);

    // Verify signatures for all messages
    for (const message of allMessages) {
      if (message.signature) {
        const link: MessageLink = {
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

    // Sort messages by signedAt (newest first)
    allMessages.sort((a, b) => b.signedAt - a.signedAt);

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

    // Step 3: Create the message data structure for signing
    const currentTime = Math.floor(Date.now() / 1000);
    const nonce = isEncrypted ? BigInt(ethers.hexlify(ethers.randomBytes(16))) : BigInt(0);
    
    const messageData: MessageData = {
      cid: messageCid, // Now we have the actual CID from IPFS
      encrypted: isEncrypted,
      encryptionAlgorithm: isEncrypted ? "AES-256-GCM" : "",
      encryptionKeyFingerprint: isEncrypted ? "placeholder-fingerprint" : "",
      chainId: BigInt(100),
      signerAddress: avatarState.avatar.address.toLowerCase(),
      signedAt: BigInt(currentTime),
      nonce: nonce
    };

    // Step 4: Create signature for the message
    const signature = await createMessageSignature(messageData);

    // Step 5: Create new message link with signature
    const newLink: MessageLink = {
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

    // Step 6: Upload message and update profile (this will handle the rest)
    await uploadMessageAndUpdateProfile(
      $circles,
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