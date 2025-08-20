<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { popupControls } from '$lib/stores/popUp';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { runTask } from '$lib/utils/tasks';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { fetchFromIpfs } from '$lib/utils/ipfs';

  interface Props {
    recipientAddress?: Address;
    onMessageSent?: () => void;
  }

  let { recipientAddress = $bindable(undefined), onMessageSent }: Props = $props();

  let messageText = $state('');
  let isEncrypted = $state(false);

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

      // Upload message content directly to IPFS
      const messageBuffer = new TextEncoder().encode(JSON.stringify(messageContent));
      const messageAddResult = await fetch('http://127.0.0.1:5001/api/v0/add', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', new Blob([messageBuffer]), 'message.json');
          return formData;
        })()
      });
      
      if (!messageAddResult.ok) {
        throw new Error('Failed to upload message to IPFS');
      }
      
      const messageResult = await messageAddResult.json();
      const messageCid = messageResult.Hash;

      // Get current profile
      const currentProfileCid = await $circles.data.getMetadataCidForAddress(avatarState.avatar.address);
      let currentProfile: any = {};
      
        // Fetch profile directly from IPFS
      currentProfile = await fetchFromIpfs(currentProfileCid, 1000);


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

      // Create new message link
      const newLink = {
        cid: messageCid,
        encrypted: isEncrypted,
        encryptionAlgorithm: null,
        encryptionKeyFingerprint: null,
        chainId: 100,
        signerAddress: avatarState.avatar.address.toLowerCase(),
        signedAt: Math.floor(Date.now() / 1000),
        nonce: isEncrypted ? ethers.hexlify(ethers.randomBytes(16)) : "",
        signature: "" // Could implement signing here
      };

      // Add new message to links
      linksData.links.push(newLink);

      // Upload updated links directly to IPFS
      const linksBuffer = new TextEncoder().encode(JSON.stringify(linksData));
      const linksAddResult = await fetch('http://127.0.0.1:5001/api/v0/add', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', new Blob([linksBuffer]), 'links.json');
          return formData;
        })()
      });

      if (!linksAddResult.ok) {
        throw new Error('Failed to upload updated links to IPFS');
      }

      const linksResult = await linksAddResult.json();
      const newNamespaceCid = linksResult.Hash;

      // Update profile with new namespace CID
      currentProfile.namespaces[recipientKey] = newNamespaceCid;

      // Upload updated profile directly to IPFS
      const profileBuffer = new TextEncoder().encode(JSON.stringify(currentProfile));
      const profileAddResult = await fetch('http://127.0.0.1:5001/api/v0/add', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', new Blob([profileBuffer]), 'profile.json');
          return formData;
        })()
      });

      if (!profileAddResult.ok) {
        throw new Error('Failed to upload updated profile to IPFS');
      }

      const profileResult = await profileAddResult.json();
      const newProfileCid = profileResult.Hash;

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