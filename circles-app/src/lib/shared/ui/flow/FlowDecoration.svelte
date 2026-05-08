<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
        /** md=2xl, lg=4xl, xl=6xl */
        size?: 'md'|'lg'|'xl';
    }
    let { children, size = 'lg' }: Props = $props();
    const widthClass = size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-xl';
</script>

<article class={`w-full ${widthClass} mx-auto flex flex-col gap-3`}>
    {@render children?.()}
</article>
