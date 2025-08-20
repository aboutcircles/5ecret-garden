<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { getTimeAgo } from '$lib/utils/shared';
  import { popupControls } from '$lib/stores/popUp';
  import WriteMessage from './WriteMessage.svelte';
  import type { Address } from '@circles-sdk/utils';

  interface Message {
    txt: string;
    cid: string;
    senderAddress: Address;
    encrypted: boolean;
    signedAt: number;
    signature: string;
    nonce: string;
    chainId: number;
  }

  interface Props {
    contactAddress: Address;
    messages: Message[];
    currentUserAddress?: Address;
  }

  let { contactAddress, messages, currentUserAddress }: Props = $props();

  // Sort messages chronologically (oldest first for conversation view)
  let sortedMessages = $derived([...messages].sort((a, b) => a.signedAt - b.signedAt));

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
</script>

<div class="flex flex-col w-full max-w-2xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b">
    <Avatar 
      address={contactAddress}
      view="horizontal"
      clickable={false}
    />
    <button class="btn btn-primary btn-sm" onclick={replyToContact}>
      <img src="/reply.svg" alt="Reply" class="w-4 h-4" />
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
      {#each sortedMessages as message (message.cid)}
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
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer with message info -->
  <div class="border-t p-4 bg-base-100">
    <div class="text-xs text-gray-500 text-center">
      {messages.length} message{messages.length !== 1 ? 's' : ''} in this conversation
    </div>
  </div>
</div>