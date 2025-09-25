<script lang="ts">
  import { onMount } from 'svelte';
  import { popupControls } from '$lib/stores/popUp';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
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
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { RefreshCw as LRefresh, PenTool as LPen, Trash as LTrash } from 'lucide';

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

  type Action = {
    id: string;
    label: string;
    iconNode: any;
    onClick: () => void;
    variant: 'primary' | 'ghost';
    disabled?: boolean;
  };

  let actions: Action[] = $derived([
    {
      id: 'refresh',
      label: 'Refresh',
      iconNode: LRefresh,
      onClick: fetchMessages,
      variant: 'ghost',
      disabled: isLoading
    },
    {
      id: 'write',
      label: 'Write Message',
      iconNode: LPen,
      onClick: openWriteMessage,
      variant: 'primary'
    },
    ...(import.meta.env.DEV ? [{
      id: 'debug-clear',
      label: 'Debug: Clear All',
      iconNode: LTrash,
      onClick: handleDebugClearMessages,
      variant: 'ghost' as const,
      disabled: isLoading
    }] : [])
  ]);
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <svelte:fragment slot="title">
    <h1 class="h2 m-0">Inbox</h1>
  </svelte:fragment>

  <svelte:fragment slot="meta">
    {groupedMessages.length} conversations
  </svelte:fragment>

  <svelte:fragment slot="actions">
    {#each actions as action (action.id)}
      <button
        type="button"
        class={`btn btn-sm ${action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={action.onClick}
        disabled={action.disabled}
        aria-label={action.label}
      >
        {#if action.id === 'refresh' && isLoading}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          <Lucide
            icon={action.iconNode}
            size={16}
            class={action.variant === 'primary' ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'}
          />
        {/if}
        <span>{action.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="collapsed-left">
    <div class="flex items-center gap-2">
      <span class="font-medium">Inbox</span>
      <span class="text-sm text-base-content/60">{groupedMessages.length} conversations</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="collapsed-menu">
    {#each actions as action (action.id)}
      <button
        type="button"
        class={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={action.onClick}
        disabled={action.disabled}
        aria-label={action.label}
      >
        {#if action.id === 'refresh' && isLoading}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          <Lucide
            icon={action.iconNode}
            size={20}
            class={action.variant === 'primary' ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'}
          />
        {/if}
        <span>{action.label}</span>
      </button>
    {/each}
  </svelte:fragment>

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
</PageScaffold>