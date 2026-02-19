<script lang="ts">
  import type { Snippet } from 'svelte';
  import { popupControls, popupState } from '$lib/shared/state/popup/popUp.svelte';
  import { jumpHref } from '$lib/shared/ui/content/markdown/jump';
  import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';

  interface Props {
    url: string;
    className?: string;
    children?: Snippet;
  }

  let { url, className = '', children }: Props = $props();

  function isPlainLeftClick(e: MouseEvent): boolean {
    return (
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    );
  }

  function onClick(e: MouseEvent) {
    if (!isPlainLeftClick(e)) return;
    if (!$popupState.content) return;

    e.preventDefault();
    popupControls.open({
      title: 'Leaving this app',
      component: JumpPopup,
      props: { to: url },
    });
  }
</script>

<a class={className} href={jumpHref(url)} onclick={onClick}>
  {@render children?.()}
</a>
