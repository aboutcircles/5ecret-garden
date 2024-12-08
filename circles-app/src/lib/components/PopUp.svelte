<script context="module" lang="ts">
  import { writable } from 'svelte/store';
  import type { SvelteComponent } from 'svelte';

  export type PopupControls = {
    close: (() => void) | null;
    open: ((content: PopupContentDefinition) => void) | null;
  };

  export type PopupContentDefinition = {
    title: string;
    component: typeof SvelteComponent;
    props: Record<string, any>;
  };

  export type PopupContentApi = {
    close: () => void;
    open: (content: PopupContentDefinition) => void;
    back: () => void;
  };

  export const popupControls = writable<PopupControls>({
    close: null,
    open: null,
  });
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { expoOut } from 'svelte/easing';

  const dispatch = createEventDispatcher();

  let initialY: number;
  let currentY: number;
  let popupHeight: number = 4096;

  let popupContent: PopupContentDefinition | undefined;

  const y = tweened(popupHeight, { duration: 300, easing: expoOut });

  let popup: HTMLDivElement;

  $popupControls.open = (content: PopupContentDefinition | undefined) => {
    if (!content) {
      $popupControls?.close?.();
      return;
    }

    popupContent = content;
    if (!popupContent.props) {
      popupContent.props = {};
    }
    if (!popupContent.props.context) {
      popupContent.props.context = {};
    }

    dispatch('openingStart'); // Event when opening starts
    y.set(0, { duration: 300, easing: expoOut }).then(() => {
      dispatch('openingComplete'); // Event when opening completes
    });
  };

  $popupControls.close = async () => {
    popupHeight = popup.offsetHeight;
    await y.set(popupHeight, { duration: 300, easing: expoOut });
    popupContent = undefined;
    stack.length = 0;
    dispatch('close');
  };

  const handleMove = (event: MouseEvent | TouchEvent) => {
    currentY = getY(event);
    const deltaY = currentY - initialY;
    y.set(deltaY > 0 ? deltaY : 0, { duration: 0 }); // Update position without animation
  };

  const handleEnd = () => {
    stopVelocityTracking();
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    
    y.set(0, { duration: 300, easing: expoOut });
  };

  let velocityInterval: NodeJS.Timeout;

  const stopVelocityTracking = () => {
    clearInterval(velocityInterval);
  };

  const getY = (event: MouseEvent | TouchEvent) => {
    return event instanceof MouseEvent
      ? event.clientY
      : event.touches[0].clientY;
  };

  const stack: PopupContentDefinition[] = [];

  const contentApi: PopupContentApi = {
    close: () => {
      $popupControls.close?.();
    },
    open: (content: PopupContentDefinition) => {
      if (popupContent) {
        stack.push(popupContent);
      }
      $popupControls.open?.({
        ...content,
        props: {
          ...content.props,
          contentApi: contentApi,
        },
      });
    },
    back: () => {
      if (stack.length === 0) {
        throw new Error('No previous content to go back to.');
      }
      const previousContent = stack.pop();
      if (previousContent) {
        $popupControls.open?.({
          ...previousContent,
          props: {
            ...previousContent.props,
            contentApi: contentApi,
          },
        });
      }
    },
  };
</script>

<div
  class="popup rounded-t-lg overflow-y-auto"
  bind:this={popup}
  style="--y: {$y}px"
>
  <div class="w-full p-4 sm:w-[90%] lg:w-3/5 relative">
    <div class="absolute left-4 top-4">
      {#if stack.length > 0}
        <button
          class="flex w-fit rounded-lg p-2 bg-gray-100"
          on:click={() => {
            contentApi.back();
          }}
        >
          <img alt="Back" src="/arrow-left.svg" class="w-4 h-4" />
        </button>
      {:else}
        <button
          type="button"
          class="flex w-fit rounded-lg p-2 bg-gray-100"
          on:click={() => {
            contentApi?.close?.();
          }}
        >
          <img src="/close.svg" alt="Close" class="w-4 h-4" />
        </button>
      {/if}
    </div>
    <!-- <button
      class="pull-bar card-title mt-10"
      on:mousedown={handleStart}
      on:touchstart={handleStart}
    >
      {popupContent?.title ?? ' - '}
    </button> -->
    <div class="content mt-2 w-full">
      {#if popupContent}
        <svelte:component
          this={popupContent.component}
          {contentApi}
          context={popupContent.props.context}
          {...popupContent.props}
        />
      {/if}
    </div>
    <!--    <div class="action-bar">-->
    <!--        <button>&lt; Previous</button>-->
    <!--        <button>Next &gt;</button>-->
    <!--    </div>-->
  </div>
</div>

<style>
  .popup {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 80%;
    min-height: 80%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: white;
    z-index: 20; /* Ensure popup is above overlay */
    transform: translateY(
      var(--y)
    ); /* use the CSS variable to set the position */
  }

  .content {
    overflow-y: auto;
    flex-grow: 1;
  }
</style>
