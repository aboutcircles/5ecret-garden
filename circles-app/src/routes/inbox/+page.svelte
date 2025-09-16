<script lang="ts">
  import { onMount } from 'svelte';
  import { popupControls } from '$lib/stores/popUp';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import WriteMessage from './WriteMessage.svelte';
  import ConversationView from './ConversationView.svelte';
  import { getTimeAgo } from '$lib/utils/shared';
  import {
    fetchAllMessages,
    groupMessagesByConversation,
    getConversationMessages,
    debugClearAllSentMessages
  } from '$lib/utils/messageUtils';
  import type { Message, MessageGroup } from '$lib/utils/messageTypes';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import type { Address } from '@circles-sdk/utils';

  let messages: Message[] = $state([]);
  let groupedMessages: MessageGroup[] = $state([]);
  let isLoading = $state(false);

  async function fetchMessages() {
    if (!avatarState.avatar?.address) {
      return;
    }

    isLoading = true;
    
    try {
      // Fetch all messages using the utility function
      messages = await fetchAllMessages();
      
      // Group messages by conversation partner
      groupedMessages = groupMessagesByConversation(messages, avatarState.avatar.address);
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
    const conversationMessages = getConversationMessages(
      messages,
      contactAddress,
      avatarState.avatar?.address!
    );

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

  async function handleDebugClearMessages() {
    if (!confirm('🚨 WARNING: This will permanently delete ALL your sent messages! Are you sure?')) {
      return;
    }

    try {
      isLoading = true;
      await debugClearAllSentMessages();

      // Refresh messages after clearing
      await fetchMessages();

      alert('✅ All sent messages cleared successfully!');
    } catch (error) {
      console.error('Failed to clear messages:', error);
      alert('❌ Failed to clear messages. Check console for details.');
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchMessages();
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

      <!-- Debug button (only in development) -->
      {#if import.meta.env.DEV}
        <button class="btn btn-error btn-sm text-white" onclick={handleDebugClearMessages} disabled={isLoading}>
          🗑️ Debug: Clear All
        </button>
      {/if}

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
    <div class="w-full md:border rounded-lg flex flex-col divide-y">
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