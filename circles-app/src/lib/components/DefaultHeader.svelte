<script lang="ts">

    interface Props {
        text?: string | undefined;
        address?: string | undefined;
        logo?: string | undefined;
        homeLink?: string; // kept for API compatibility
        menuItems?: { name: string; link: string }[]; // kept for compatibility
        quickAction?: any; // kept for compatibility
        route?: string | null; // kept for compatibility
    }

    let {
        text = undefined,
        address = undefined
    }: Props = $props();
</script>