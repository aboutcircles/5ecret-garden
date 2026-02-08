<script lang="ts">
    import DomainProfileExplorer from '$lib/domains/profile/ui/ProfileExplorer.svelte';
    import type { Address } from '@circles-sdk/utils';

    interface Props {
        avatar?: Address;
        pinApiBase?: string;
        showAdvancedSections?: boolean;
        showNamespaces?: boolean;
        showSigningKeys?: boolean;
    }

    let props: Props = $props();
</script>

<DomainProfileExplorer {...props} />
