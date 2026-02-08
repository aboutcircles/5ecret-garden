 <script lang="ts">
  import { ethers } from 'ethers';

  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import type { CreateGatewayFlowContext } from './context';
  import ConfirmCreateGateway from './ConfirmCreateGateway.svelte';
import { ProfileHeaderEditor } from '$lib/domains/profile/ui';
  import { isValidOnChainName } from '$lib/shared/utils/isValid';

  interface Props {
    context?: CreateGatewayFlowContext;
    onCreated?: (gateway: string) => void;
  }

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

  let onChainNameOpen = $state(false);
  let onChainNameManual = $state(false);

  function truncateAscii(value: string, maxBytes: number): string {
    if (value.length <= maxBytes) {
      return value;
    }
    return value.slice(0, maxBytes);
  }

  function deriveOnChainName(value: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    const sanitized = trimmed.replace(/[^0-9A-Za-z \-_.()'&+#]/g, '');
    return truncateAscii(sanitized, 32);
  }

  $effect(() => {
    if (!onChainNameManual) {
      ctx.gatewayName = deriveOnChainName(ctx.profile?.name ?? '');
    }
  });

  function toggleOnChainName(): void {
    onChainNameOpen = !onChainNameOpen;
  }

  function handleManualToggle(enabled: boolean): void {
    onChainNameManual = enabled;
    if (!enabled) {
      ctx.gatewayName = deriveOnChainName(ctx.profile?.name ?? '');
    }
  }

  function handleManualToggleChange(event: Event): void {
    const target = event.currentTarget as HTMLInputElement | null;
    handleManualToggle(target?.checked ?? false);
  }

  function goNext() {
    if (!canContinue) {
      return;
    }
    popupControls.open({
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
      <ProfileHeaderEditor
        bind:name={ctx.profile.name}
        bind:description={ctx.profile.description}
        bind:previewImageUrl={ctx.profile.previewImageUrl}
        bind:imageUrl={ctx.profile.imageUrl}
        showLocation={false}
      />
    </div>

    <div class="border border-base-200 rounded-xl p-3">
      <button
        type="button"
        class="flex items-center justify-between w-full text-xs font-semibold text-left"
        onclick={toggleOnChainName}
      >
        <span>On-chain name</span>
        <span class={onChainNameOpen ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <img src="/chevron-down.svg" alt="Toggle" class="w-4 h-4" />
        </span>
      </button>

      <div class="mt-1 text-xs text-base-content/60">
        {#if ctx.gatewayName}
          {ctx.gatewayName}
        {:else}
          Derived from the profile name
        {/if}
      </div>

      {#if onChainNameOpen}
        <div class="mt-3 space-y-2">
          <label class="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={onChainNameManual}
              onchange={handleManualToggleChange}
            />
            Set on-chain name manually
          </label>

          <label class="form-control w-full">
            <span class="label-text text-xs">On-chain name</span>
            <input
              class="input input-sm input-bordered w-full"
              bind:value={ctx.gatewayName}
              placeholder="My Shop"
              disabled={!onChainNameManual}
            />
          </label>
          <p class="text-xs text-base-content/60">
            On-chain names follow stricter rules (ASCII only, max 32 characters).
          </p>
          {#if hasName && !onChainNameValid}
            <p class="text-xs text-error">
              Only ASCII letters, numbers, spaces, and - _ . ( ) ' & + # are allowed (max 32 chars).
            </p>
          {/if}
        </div>
      {/if}
    </div>


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
