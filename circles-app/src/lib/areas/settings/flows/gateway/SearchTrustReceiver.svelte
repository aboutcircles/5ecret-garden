<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import { GATEWAY_TRUST_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { isAddress } from '$lib/shared/utils/tx';
  import { openStep } from '$lib/shared/flow';
  import ConfirmGatewayTrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayTrust.svelte';

  interface Props {
    gateway: string;
    onTrusted?: () => void | Promise<void>;
  }

  let { gateway, onTrusted }: Props = $props();
  let selectionError: string | null = $state(null);

  const gatewayValid = $derived(isAddress((gateway ?? '').trim()));

  $effect(() => {
    if (gatewayValid && selectionError) {
      selectionError = null;
    }
  });

  const avatarTypes = [
    'CrcV2_RegisterHuman',
    'CrcV2_RegisterOrganization',
    'CrcV2_RegisterGroup'
  ];

  function onselect(address: string) {
    selectionError = null;
    if (!gatewayValid) {
      selectionError = 'Gateway address is invalid. Please reopen trust management from a valid gateway.';
      return;
    }
    if (!isAddress((address ?? '').trim())) {
      selectionError = 'Selected account address is invalid. Please choose another account.';
      return;
    }

    openStep({
      title: 'Confirm trust',
      component: ConfirmGatewayTrust,
      props: {
        gateway,
        trustReceiver: address,
        onTrusted
      },
      key: `pg-trust:${gateway}:${address}`
    });
  }
</script>

<FlowStepScaffold
  {...GATEWAY_TRUST_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Search account"
  subtitle="Find the account you want this gateway to trust."
>
  {#if !gatewayValid}
    <StepAlert
      variant="warning"
      message="Gateway address is invalid. Selecting an account is disabled."
    />
  {/if}

  {#if selectionError}
    <StepAlert variant="error" message={selectionError} />
  {/if}

  <p class="text-sm text-base-content/70">
    Search the full network to add a trusted account for this gateway.
  </p>

  {#if gatewayValid}
    <SearchAvatar
      avatarTypes={avatarTypes}
      searchType="contact"
      inputDataAttribute="data-popup-initial-input"
      {onselect}
    />
  {:else}
    <p class="text-xs text-base-content/70">
      Trust receiver search is unavailable until a valid gateway address is provided.
    </p>
  {/if}
</FlowStepScaffold>

