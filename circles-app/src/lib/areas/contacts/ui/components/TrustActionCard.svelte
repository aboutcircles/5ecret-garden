<script lang="ts">
  import ActionButton from '$lib/shared/ui/common/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';

  interface Props {
    address: `0x${string}`;
    intro: string;
    warning: string;
    cta: string;
    action: () => void | Promise<void>;
  }

  let { address, intro, warning, cta, action }: Props = $props();

  async function runAction(): Promise<void> {
    await action();
  }
</script>

<div class="flex flex-col gap-y-4 mt-8">
  <p>{intro}</p>

  <RowFrame clickable={false} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar {address} clickable={false} view="horizontal" bottomInfo={address} />
    </div>
  </RowFrame>

  <div role="alert" class="alert alert-warning">
    <span>{warning}</span>
  </div>

  <div>
    <ActionButton action={runAction}>{cta}</ActionButton>
  </div>
</div>
