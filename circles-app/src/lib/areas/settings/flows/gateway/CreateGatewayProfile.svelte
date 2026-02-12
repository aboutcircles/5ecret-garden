 <script lang="ts">
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import OnChainNameSection from '$lib/shared/ui/flow/OnChainNameSection.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
  import type { CreateGatewayFlowContext } from './context';
  import ConfirmCreateGateway from './ConfirmCreateGateway.svelte';
  import { ProfileFormStep } from '$lib/shared/ui/profile';
  import { isValidOnChainName } from '$lib/shared/utils/isValid';
  import type { ProfileEditStepProps } from '$lib/shared/flow/contracts';

  type Props = Partial<ProfileEditStepProps<CreateGatewayFlowContext>> & {
    onCreated?: (gateway: string) => void;
  };

  let { context = $bindable(), onCreated }: Props = $props();

  const FACTORY_ADDRESS = '0x186725D8fe10a573DC73144F7a317fCae5314F19';

  let ctx: CreateGatewayFlowContext = $state(
    context ?? {
      factoryAddress: FACTORY_ADDRESS,
      gatewayName: '',
      metadataDigest: '0x0000000000000000000000000000000000000000000000000000000000000000',
      profile: {
        name: '',
        description: '',
        imageUrl: '',
        previewImageUrl: ''
      }
    }
  );

  // Always enforce the configured factory address
  ctx.factoryAddress = FACTORY_ADDRESS;

  // keep prop in sync if parent passes a context object
  $effect(() => {
    context = ctx;
  });

  function isAddress(v: string): boolean {
    try {
      ethers.getAddress(v);
      return true;
    } catch {
      return false;
    }
  }

  const trimmedGatewayName = $derived((ctx.gatewayName ?? '').trim());
  const hasName = $derived(trimmedGatewayName.length > 0);
  const onChainNameValid = $derived(hasName && isValidOnChainName(trimmedGatewayName));
  const factoryValid = $derived(isAddress(ctx.factoryAddress));

  // Metadata digest will be derived from the pinned gateway profile.

  const profileHasName = $derived((ctx.profile?.name ?? '').trim().length > 0);
  const canContinue = $derived(onChainNameValid && factoryValid && profileHasName);

  function goNext() {
    if (!canContinue) {
      return;
    }
    openStep({
      title: 'Confirm payment gateway',
      component: ConfirmCreateGateway,
      props: { context: ctx, onCreated }
    });
  }
</script>

<FlowDecoration>
  <div class="space-y-4">
    <p class="text-sm text-base-content/70">
      Define the basic details for your payment gateway.
    </p>

    <div class="space-y-2">
      <div class="text-sm font-semibold">Gateway profile</div>
      <div class="bg-warning/10 border border-warning/30 text-warning-content rounded-xl p-3 text-xs">
        The gateway profile metadata is pinned during creation and can’t be changed later.
      </div>
      <ProfileFormStep
        bind:name={ctx.profile.name}
        bind:description={ctx.profile.description}
        bind:previewImageUrl={ctx.profile.previewImageUrl}
        bind:imageUrl={ctx.profile.imageUrl}
        showLocation={false}
        showSubmit={false}
      />
    </div>

    <OnChainNameSection
      bind:value={ctx.gatewayName}
      sourceValue={ctx.profile?.name ?? ''}
      placeholder="My Shop"
      invalid={hasName && !onChainNameValid}
    />


    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="btn btn-primary"
        onclick={goNext}
        disabled={!canContinue}
      >
        Continue
      </button>
    </div>
  </div>
</FlowDecoration>
