<script lang="ts">
  import type { Snippet } from 'svelte';
  import { popupControls, popupState } from '$lib/shared/state/popup';
  import { jumpHref } from '$lib/shared/ui/content/markdown/jump';
  import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';

  interface Props {
    url: string;
    className?: string;
    style?: string;
    ariaLabel?: string;
    children?: Snippet;
  }

  let { url, className = '', style, ariaLabel, children }: Props = $props();

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

    e.preventDefault();
    popupControls.open({
      title: 'Leaving this app',
      component: JumpPopup,
      props: { to: url },
    });
  }
</script>

<a class={className} {style} href={jumpHref(url)} aria-label={ariaLabel} title={ariaLabel} onclick={onClick}>
  {@render children?.()}
</a>
