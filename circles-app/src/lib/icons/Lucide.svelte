<script lang="ts">
    /**
     * Minimal Svelte5 wrapper for lucide "standalone" icon nodes.
     * Pass an icon node from the "lucide" package, e.g.:
     *   import { Send } from 'lucide';
     *   <Lucide icon={Send} size={16} class="stroke-black" />
     */
    type IconNode = Array<[string, Record<string, string>]>;

    interface Props {
        icon: IconNode;
        size?: number;
        strokeWidth?: number | string;
        class?: string;
        ariaLabel?: string;
    }

    let {
        icon,
        size = 16,
        strokeWidth = 1.8,
        class: className = '',
        ariaLabel,
    }: Props = $props();
</script>

<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
        class={className}
        aria-hidden={ariaLabel ? undefined : 'true'}
        aria-label={ariaLabel}
>
    {#each icon as node (node[1]?.d ?? JSON.stringify(node))}
        {@const tag = node[0]}
        {@const attrs = node[1]}
        <svelte:element this={tag} {...attrs} />
    {/each}
</svg>
