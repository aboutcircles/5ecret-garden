<script lang="ts">
  import { ethers } from 'ethers';

  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import { GATEWAY_PROFILE_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { isAddress } from '$lib/shared/utils/tx';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import type { CreateGatewayFlowContext } from './context';
  import { gnosisMarketConfig } from '$lib/shared/config/market';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { ensureProfileShape, cidV0ToDigest32Strict } from '@circles-profile/core';
  import { isValidOnChainName } from '$lib/shared/utils/isValid';
  import ProfilePreviewCard from '$lib/shared/ui/profile/ProfilePreviewCard.svelte';
  import AdvancedDetails from '$lib/shared/ui/flow/AdvancedDetails.svelte';
  import type { ReviewStepProps } from '$lib/shared/flow';
  import CreateGatewayProfile from './CreateGatewayProfile.svelte';

  type Props = ReviewStepProps<CreateGatewayFlowContext> & {
    onCreated?: (gateway: string) => void;
  };

  let { context, onCreated }: Props = $props();

  const factoryAbi = [
    'function createGateway(string name, bytes32 metadataDigest) returns (address)',
    'event GatewayCreated(address indexed owner, address indexed gateway)'
  ];
  const factoryIface = new ethers.Interface(factoryAbi);

  const factoryValid = $derived(isAddress((context.factoryAddress ?? '').trim()));
  const trimmedGatewayName = $derived((context.gatewayName ?? '').trim());
  const nameValid = $derived(trimmedGatewayName.length > 0 && isValidOnChainName(trimmedGatewayName));
  const profileNameValid = $derived((context.profile?.name ?? '').trim().length > 0);

  const canSubmit = $derived(factoryValid && nameValid && profileNameValid);

  function getBindings() {
    return getProfilesBindings({ pinApiBase: gnosisMarketConfig.marketApiBase }).bindings;
  }

  async function createGateway() {
    if (!canSubmit) {
      return;
    }
    if (!$wallet) {
      throw new Error('Wallet not connected.');
    }

    await runTask({
      name: 'Creating payment gateway…',
      promise: (async () => {
        const runner: any = $wallet;
        const factoryAddress = context.factoryAddress as `0x${string}`;

        const bindings = getBindings();

        const profilePayload = ensureProfileShape({
          '@context': 'https://aboutcircles.com/contexts/circles-profile/',
          '@type': 'Profile',
          name: context.profile?.name ?? '',
          description: context.profile?.description ?? '',
          imageUrl: context.profile?.imageUrl || undefined,
          previewImageUrl: context.profile?.previewImageUrl || undefined,
          namespaces: {},
          signingKeys: {},
        });

        const profileCid = await (bindings as any).putJsonLd(profilePayload);

        if (!profileCid) {
          throw new Error('Failed to pin gateway profile metadata.');
        }

        context.metadataDigest = cidV0ToDigest32Strict(profileCid);

        const data = factoryIface.encodeFunctionData('createGateway', [
          context.gatewayName,
          context.metadataDigest
        ]);

        const tx = await runner.sendTransaction({
          to: factoryAddress,
          value: 0n,
          data
        });

        const receipt = await runner.provider.waitForTransaction(tx.hash);
        if (!receipt) {
          throw new Error('No transaction receipt found.');
        }

        let createdGateway: string | null = null;

        for (const log of receipt.logs ?? []) {
          try {
            const parsed = factoryIface.parseLog(log);
            if (parsed?.name === 'GatewayCreated') {
              const gw = (parsed.args?.[1] as string | undefined) ?? '';
              if (gw) {
                createdGateway = ethers.getAddress(gw);
                break;
              }
            }
          } catch {
            // ignore non-matching logs
          }
        }

        if (createdGateway) {
          try {
            localStorage.setItem('pg_gateway', createdGateway);
          } catch {
            // ignore
          }
          onCreated?.(createdGateway);
        }
      })()
    });

    // Close the flow after submit (success or error)
    popupControls.close();
  }

  function editGatewayProfile() {
    popToOrOpen(CreateGatewayProfile, {
      title: 'Create payment gateway',
      props: { context, onCreated }
    });
  }
</script>
<FlowStepScaffold
  {...GATEWAY_PROFILE_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Confirm"
  subtitle="Review receiver details before updating trust."
>

  <div class="space-y-4">
    <p class="text-sm text-base-content/70">
      Please confirm the details of the payment gateway before creating it.
    </p>

    <StepSection title="Gateway profile">
      <StepReviewRow
        label="Profile"
        value={context.profile?.name || '—'}
        onChange={editGatewayProfile}
        changeLabel="Edit"
      />

      <ProfilePreviewCard profile={context.profile} title="Gateway profile" />
    </StepSection>

    <AdvancedDetails title="Advanced gateway details" subtitle="Factory + on-chain name">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content/60">On-chain name</span>
        <span class="text-sm font-semibold">{context.gatewayName}</span>
      </div>
      <div class="text-sm">
        <div class="text-base-content/70">Factory</div>
        <div class="font-mono break-all">{context.factoryAddress}</div>
      </div>
    </AdvancedDetails>

    {#if !factoryValid || !nameValid || !profileNameValid}
      <StepAlert variant="warning" className="text-xs">
        <ul class="list-disc list-inside">
          {#if !nameValid}
            <li>On-chain name is required and must follow the on-chain naming rules.</li>
          {/if}
          {#if !profileNameValid}
            <li>Gateway profile name is required.</li>
          {/if}
          {#if !factoryValid}
            <li>Factory address is invalid.</li>
          {/if}
        </ul>
      </StepAlert>
    {/if}

    <StepActionButtons
      primaryLabel="Create gateway"
      onPrimary={createGateway}
      primaryDisabled={!canSubmit}
    />
  </div>
</FlowStepScaffold>
