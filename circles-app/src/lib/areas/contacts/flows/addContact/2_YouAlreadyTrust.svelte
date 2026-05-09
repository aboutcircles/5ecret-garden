<script lang="ts">
  import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
  import type { AddContactFlowContext } from '$lib/areas/contacts/flows/addContact/context';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { ADD_CONTACT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import AdvancedDetails from '$lib/shared/ui/flow/AdvancedDetails.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import SearchStep from './1_Search.svelte';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    context: AddContactFlowContext;
  }

  let { context }: Props = $props();

  function editSelection() {
    popToOrOpen(SearchStep, {
      title: 'Add contact',
    });
  }
</script>

<FlowStepScaffold
  {...ADD_CONTACT_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Trust status"
  subtitle="Review current trust relationship and choose next action."
>

  <StepAlert
    variant="info"
    title="Trust already exists"
    message="You already trust this account. You can close this flow or continue to untrust."
  />

  {#if context.selectedAddress}
    <AdvancedDetails title="Advanced details" subtitle="Selected account">
      <Avatar address={context.selectedAddress} view="horizontal" clickable={false} bottomInfo={context.selectedAddress} showTypeInfo={true} />
    </AdvancedDetails>
  {/if}

  <StepActionBar>
    {#snippet secondary()}
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:13px;" onclick={editSelection}>
        Change account
      </button>

      <button
        style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(196,68,48,0.2);background:{T.negativeSoft};color:{T.negative};cursor:pointer;font-family:{T.fontSans};font-size:13px;"
        onclick={() => {
          popupControls.close();
          openStep({
            title: 'Untrust',
            component: Untrust,
            props: {
              address: context.selectedAddress,
              trustVersion: context.trustVersion,
            },
          });
        }}
      >
        Untrust
      </button>
    {/snippet}

    {#snippet primary()}
      <button style="height:32px;padding:0 14px;border-radius:9999px;border:0;background:{T.primary};color:#fff;cursor:pointer;font-family:{T.fontSans};font-size:13px;box-shadow:0 4px 12px rgba(88,73,212,0.25);" onclick={() => popupControls.close()}>
        Done
      </button>
    {/snippet}
  </StepActionBar>
  </FlowStepScaffold>
