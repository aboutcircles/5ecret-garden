<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
        /** sm=lg, md=2xl, lg=4xl, xl=6xl */
        size?: 'sm' | 'md' | 'lg' | 'xl';
    }
    let { children, size = 'lg' }: Props = $props();
    const widthClass = $derived(size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-4xl' : size === 'sm' ? 'max-w-lg' : 'max-w-2xl');
</script>

<article class={`w-full ${widthClass} mx-auto flex flex-col gap-4`}>
    {@render children?.()}
</article>
