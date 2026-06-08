<script lang="ts">

  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import { GATEWAY_PROFILE_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import OnChainNameSection from '$lib/shared/ui/flow/OnChainNameSection.svelte';
  import { openStep } from '$lib/shared/flow';
  import type { CreateGatewayFlowContext } from './context';
  import ConfirmCreateGateway from './ConfirmCreateGateway.svelte';
  import { ProfileFormStep } from '$lib/shared/ui/profile';
  import { isValidOnChainName } from '$lib/shared/utils/isValid';
  import { isAddress } from '$lib/shared/utils/tx';
  import type { ProfileEditStepProps } from '$lib/shared/flow';
  import { T } from '$lib/design-system/tokens.js';

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

  const trimmedGatewayName = $derived((ctx.gatewayName ?? '').trim());
  const hasName = $derived(trimmedGatewayName.length > 0);
  const onChainNameValid = $derived(hasName && isValidOnChainName(trimmedGatewayName));
  const factoryValid = $derived(isAddress((ctx.factoryAddress ?? '').trim()));

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

<FlowStepScaffold
  {...GATEWAY_PROFILE_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Gateway profile"
  subtitle="Define metadata and on-chain name for the payment gateway."
>

  <div style="display:flex;flex-direction:column;gap:16px;">
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Define the basic details for your payment gateway.
    </p>

    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:13px;font-weight:600;color:{T.ink};">Gateway profile</div>
      <StepAlert
        variant="warning"
        message="Gateway profile metadata is pinned during creation and can’t be changed later."
      />
      <ProfileFormStep
        bind:name={ctx.profile.name}
        bind:description={ctx.profile.description}
        bind:previewImageUrl={ctx.profile.previewImageUrl}
        bind:imageUrl={ctx.profile.imageUrl}
        showLocation={false}
        showSubmit={false}
        nameInputDataAttribute="data-popup-initial-input"
      />
    </div>

    <OnChainNameSection
      bind:value={ctx.gatewayName}
      sourceValue={ctx.profile?.name ?? ''}
      placeholder="My Shop"
      invalid={hasName && !onChainNameValid}
    />

    <StepActionButtons
      primaryLabel="Continue"
      onPrimary={goNext}
      primaryDisabled={!canContinue}
    />
  </div>
</FlowStepScaffold>
