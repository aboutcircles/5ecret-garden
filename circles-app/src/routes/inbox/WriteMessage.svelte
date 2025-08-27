<script lang="ts">
  import { popupControls } from '$lib/stores/popUp';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { runTask } from '$lib/utils/tasks';
  import type { Address } from '@circles-sdk/utils';
  import { ethers } from 'ethers';
  import { sendMessage } from '$lib/utils/messageUtils';

  interface Props {
    recipientAddress?: Address;
    onMessageSent?: () => void;
  }

  let { recipientAddress = $bindable(undefined), onMessageSent }: Props = $props();

  let messageText = $state('');
  let isEncrypted = $state(false);

  async function sendMessageHandler() {
    if (!recipientAddress || !messageText.trim()) {
      throw new Error('Missing required data for sending message');
    }

    if (!ethers.isAddress(recipientAddress)) {
      throw new Error('Invalid recipient address');
    }

    try {
      await sendMessage(recipientAddress, messageText, isEncrypted);

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

  async function handleSendMessage() {
    await runTask({
      name: `Sending message to ${recipientAddress?.slice(0, 6)}...${recipientAddress?.slice(-4)}`,
      promise: sendMessageHandler()
    });
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
          Message will be encrypted and signed (feature in development)
        {:else}
          Message will be signed but stored as plain text
        {/if}
      </span>
    </label>
  </div>

  <div class="flex gap-2 justify-end">
    <button class="btn btn-ghost" onclick={() => popupControls.close()}>
      Cancel
    </button>
    <ActionButton action={handleSendMessage} disabled={!canSend}>
      Send Message
    </ActionButton>
  </div>
</div>