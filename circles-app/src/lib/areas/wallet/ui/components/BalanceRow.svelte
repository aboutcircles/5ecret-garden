<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { createEventDispatcher } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import { crcTypes, roundToDecimals, staticTypes } from '$lib/shared/utils/shared';
  import WrapTokens from '$lib/areas/wallet/ui/pages/WrapTokens.svelte';
  import UnwrapTokens from '$lib/areas/wallet/ui/pages/UnwrapTokens.svelte';
  import RedeemGroup from '$lib/areas/groups/ui/pages/RedeemGroup.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';

  interface Props {
    item: TokenBalance;
    onclick?: () => void;
  }
  let { item, onclick: onClickProp }: Props = $props();

  type RowAction = {
    condition: (b: TokenBalance) => boolean;
    title: string;
    icon: string;
    component: any;
  };

  const actions: RowAction[] = [
    {
      condition: (b) =>
        ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(b.tokenType),
      title: 'Wrap',
      icon: '/banknotes.svg',
      component: WrapTokens,
    },
    {
      condition: (b) => b.tokenType === 'CrcV2_RegisterGroup',
      title: 'Redeem',
      icon: '/redeem.svg',
      component: RedeemGroup,
    },
    {
      condition: (b) => b.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged',
      title: 'Unwrap',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
    {
      condition: (b) =>
        b.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary',
      title: 'Unwrap Static Circles',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
  ];

  function executeAction(action: RowAction) {
    popupControls.open({
      title: action.title,
      component: action.component,
      props: { asset: item },
    });
  }

  let copyIcon = $state('/copy.svg');
  function handleCopy() {
    navigator.clipboard.writeText(
      item.isWrapped ? item.tokenAddress : String(item.tokenId)
    );
    copyIcon = '/check.svg';
    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }

  const dispatch = createEventDispatcher<{ click: void }>();
  function onClick() {
    dispatch('click');
    onClickProp?.();
  }
</script>

<!-- Use noLeading to collapse the empty first column; put the old "horizontal avatar row" inside content -->
<RowFrame
  noLeading={true}
  clickable={true}
  className="balance-row"
  onclick={onClick}
>
  <!-- CONTENT (old layout preserved) -->
  <div class="w-full flex items-center justify-between">
    <!-- Left: Avatar horizontal exactly like before -->
    <div class="min-w-0">
      <Avatar
        placeholderBottom={true}
        placeholderTop={false}
        placeholderAvatar={false}
        address={item.tokenOwner}
        view="horizontal"
        clickable={false}
        bottomInfo={tokenTypeToString(item.tokenType)}
      />
    </div>

    <!-- Right: amount + dropdown actions -->
    <div class="flex items-center gap-3 md:gap-4 shrink-0">
      <div class="text-right tabular-nums">
        <div class="font-medium">{roundToDecimals(item.circles)} CRC</div>
        <p class="text-xs text-base-content/70">
          {#if staticTypes.has(item.tokenType)}
            {roundToDecimals(item.staticCircles)} Static Circles
          {/if}
          {#if crcTypes.has(item.tokenType)}
            {roundToDecimals(item.crc)} CRC
          {/if}
        </p>
      </div>

      {#if !avatarState.isGroup}
        <div class="dropdown dropdown-end">
          <button
            tabindex="0"
            class="btn btn-ghost btn-xs"
            aria-label="Row actions"
            onclick={(e) => e.stopPropagation()}
          >
            <img src="/union.svg" alt="" class="icon" aria-hidden="true" />
          </button>
          <ul
            tabindex="0"
            role="menu"
            class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-10 w-56 p-2"
          >
            {#each actions as action (action.title)}
              {#if action.condition(item)}
                <li>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      executeAction(action);
                    }}
                  >
                    <img
                      src={action.icon}
                      alt=""
                      class="icon"
                      aria-hidden="true"
                    />
                    {action.title}
                  </button>
                </li>
              {/if}
            {/each}
            <li>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
              >
                <img src={copyIcon} alt="" class="icon" aria-hidden="true" />
                Copy
              </button>
            </li>
          </ul>
        </div>
      {/if}
    </div>
  </div>
</RowFrame>

<style>
  /* rely on RowFrame for chrome; no extra paddings here */
</style>
