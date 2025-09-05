import type { Address } from '@circles-sdk/utils';
import type { Sdk } from '@circles-sdk/sdk';
import type { UserProfile, MessageNamespace, MessageLink, MessageContent } from './messageTypes';

import { PUBLIC_IPFS_GATEWAY, PUBLIC_IPFS_API  } from '$env/static/public';

/**
 * Fetches data from IPFS using the gateway endpoint with timeout support
 * @param cid - The IPFS Content Identifier
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Promise that resolves to the parsed JSON data or null on error
 */
export async function fetchFromIpfs(cid: string, timeoutMs: number = 1000): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${PUBLIC_IPFS_GATEWAY}/ipfs/${cid}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch CID ${cid}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch from IPFS: ${cid}`, error);
    return null;
  }
}

/**
 * Uploads data to IPFS using the API endpoint
 * @param data - The data to upload (object will be JSON stringified)
 * @param filename - Optional filename for the upload
 * @returns Promise that resolves to the CID hash
 */
export async function uploadToIpfs(data: any, filename: string = 'data.json'): Promise<string> {
  const buffer = new TextEncoder().encode(JSON.stringify(data));
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);

  const response = await fetch(`${PUBLIC_IPFS_API}/api/v0/add`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to upload to IPFS: ${response.statusText}`);
  }

  const result = await response.json();
  return result.Hash;
}

/**
 * Fetches all messages from trusted connections
 */
export async function fetchMessagesFromContacts(
  circles: Sdk,
  avatarAddress: Address,
  trustedAddresses: string[]
): Promise<any[]> {
  const allMessages: any[] = [];

  // Fetch received messages (messages from contacts to us)
  for (const address of trustedAddresses) {
    try {
      // Get the profile for this contact
      const profileCid = await circles.data.getMetadataCidForAddress(address as Address);
      if (!profileCid) continue;

      // Fetch profile directly from IPFS
      const profile = await fetchFromIpfs(profileCid);
      if (!profile?.namespaces) continue;

      // Check if this contact has messages for us
      const ourNamespace = profile.namespaces[avatarAddress.toLowerCase()];
      if (!ourNamespace) continue;

      // Fetch the links from the namespace directly from IPFS
      const linksData = await fetchFromIpfs(ourNamespace);
      if (!linksData?.links) continue;

      // Process each message link (received messages)
      for (const link of linksData.links) {
        try {
          // Fetch message content directly from IPFS
          const messageContent = await fetchFromIpfs(link.cid);
          if (messageContent?.txt) {
            allMessages.push({
              txt: messageContent.txt,
              cid: link.cid,
              senderAddress: address as Address,
              encrypted: link.encrypted,
              signedAt: link.signedAt,
              signature: link.signature,
              nonce: link.nonce,
              chainId: link.chainId,
              conversationWith: avatarAddress,
              isVerified: false // Will be verified later
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

  return allMessages;
}

/**
 * Fetches all sent messages (messages from us to contacts)
 */
export async function fetchSentMessages(
  circles: Sdk,
  avatarAddress: Address,
  trustedAddresses: string[]
): Promise<any[]> {
  const sentMessages: any[] = [];

  try {
    // Get our own profile
    const ourProfileCid = await circles.data.getMetadataCidForAddress(avatarAddress);
    if (!ourProfileCid) return sentMessages;

    const ourProfile = await fetchFromIpfs(ourProfileCid);
    if (!ourProfile?.namespaces) return sentMessages;

    // Check each contact's namespace in our profile for sent messages
    for (const contactAddress of trustedAddresses) {
      const contactNamespace = ourProfile.namespaces[contactAddress.toLowerCase()];
      if (!contactNamespace) continue;

      // Fetch the links from our namespace for this contact
      const sentLinksData = await fetchFromIpfs(contactNamespace);
      if (!sentLinksData?.links) continue;

      // Process each sent message link
      for (const link of sentLinksData.links) {
        try {
          // Fetch message content directly from IPFS
          const messageContent = await fetchFromIpfs(link.cid);
          if (messageContent?.txt) {
            sentMessages.push({
              txt: messageContent.txt,
              cid: link.cid,
              senderAddress: avatarAddress,
              encrypted: link.encrypted,
              signedAt: link.signedAt,
              signature: link.signature,
              nonce: link.nonce,
              chainId: link.chainId,
              conversationWith: contactAddress as Address,
              isVerified: false // Will be verified later
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch sent message content for CID ${link.cid}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch sent messages:', err);
  }

  return sentMessages;
}

/**
 * Uploads a message and updates the user's profile
 */
export async function uploadMessageAndUpdateProfile(
  circles: Sdk,
  avatarAddress: Address,
  recipientAddress: Address,
  messageContent: MessageContent,
  newLink: MessageLink
): Promise<void> {
  // Upload message content to IPFS
  const messageCid = await uploadToIpfs(messageContent);
  newLink.cid = messageCid;

  // Get current profile
  const currentProfileCid = await circles.data.getMetadataCidForAddress(avatarAddress);
  let currentProfile: UserProfile = {};
  
  // Fetch profile directly from IPFS
  if (currentProfileCid) {
    currentProfile = await fetchFromIpfs(currentProfileCid) || {};
  }

  // Initialize namespaces if they don't exist
  if (!currentProfile.namespaces) {
    currentProfile.namespaces = {};
  }

  // Get the recipient's namespace or create it
  const recipientKey = recipientAddress.toLowerCase();
  let recipientNamespaceCid = currentProfile.namespaces[recipientKey];
  let linksData: MessageNamespace = { links: [] };

  if (recipientNamespaceCid) {
    // Load existing links
    const existingLinks = await fetchFromIpfs(recipientNamespaceCid);
    linksData = existingLinks || { links: [] };
  }

  // Add new message to links
  linksData.links.push(newLink);

  // Upload updated links to IPFS
  const newNamespaceCid = await uploadToIpfs(linksData, "links.json");

  // Update profile with new namespace CID
  currentProfile.namespaces[recipientKey] = newNamespaceCid;

  // Upload updated profile to IPFS
  const newProfileCid = await uploadToIpfs(currentProfile, "profile.json");

  // Update metadata on-chain using the avatar's method
  const avatar = await circles.getAvatar(avatarAddress);
  await avatar.updateMetadata(newProfileCid);
}