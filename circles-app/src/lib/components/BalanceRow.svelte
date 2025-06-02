<script lang="ts">
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { crcTypes, roundToDecimals, staticTypes } from '$lib/utils/shared';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import WrapTokens from '$lib/pages/WrapTokens.svelte';
  import MigrateTokens from '$lib/pages/MigrateTokens.svelte';
  import UnwrapTokens from '$lib/pages/UnwrapTokens.svelte';
  import RedeemGroup from '$lib/pages/RedeemGroup.svelte';
  import Avatar from './avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    balance: TokenBalanceRow;
  }

  let { balance }: Props = $props();

  const actions = [
    {
      condition: (balance: TokenBalanceRow) =>
        ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(
          balance.tokenType
        ),
      title: 'Wrap',
      icon: '/banknotes.svg',
      component: WrapTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_RegisterGroup',
      title: 'Redeem',
      icon: '/redeem.svg',
      component: RedeemGroup,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV1_Signup' &&
        !!avatarState.avatar?.avatarInfo &&
        avatarState.avatar?.avatarInfo?.version > 1,
      title: 'Migrate Tokens to V2',
      icon: '/banknotes.svg',
      component: MigrateTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged',
      title: 'Unwrap',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary',
      title: 'Unwrap Static Circles',
      icon: '/banknotes.svg',
      component: UnwrapTokens,
    },
  ];

  const executeAction = (action: {
    condition: (balance: TokenBalanceRow) => boolean;
    title: string;
    icon: string;
    component: any;
  }) => {
    popupControls.open?.({
      title: action.title,
      component: action.component,
      props: { asset: balance },
    });
  };

  let copyIcon = $state('/copy.svg');

  function handleCopy() {
    navigator.clipboard.writeText(balance.isWrapped ? balance.tokenAddress : balance.tokenId);
    copyIcon = '/check.svg';

    setTimeout(() => {
      copyIcon = '/copy.svg';
    }, 1000);
  }
</script>

<div class="w-full pt-2">
  <div class="w-full flex items-center justify-between p-2 rounded-lg">
    <Avatar
      placeholderBottom={true}
      placeholderTop={false}
      placeholderAvatar={false}
      address={balance.tokenOwner}
      view="horizontal"
      clickable={true}
      bottomInfo={tokenTypeToString(balance.tokenType)}
    />

    <div class="flex gap-x-2 md:gap-x-4">
      <div class="font-medium flex flex-col">
        {roundToDecimals(balance.circles)} CRC
        <p class="text-xs text-gray-500">
          {#if staticTypes.has(balance.tokenType)}
            {roundToDecimals(balance.staticCircles)} Static Circles
          {/if}
          {#if crcTypes.has(balance.tokenType)}
            {roundToDecimals(balance.crc)} CRC
          {/if}
        </p>
      </div>

      {#if !avatarState.isGroup}
        <div class="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            class="btn btn-circle btn-ghost btn-xs text-info"
          >
            <img src="/union.svg" alt="Union" class="w-4 h-4" />
          </div>
          <div
            tabIndex={0}
            class="dropdown-content bg-base-100 rounded-box shadow-sm z-10"
          >
            {#each actions as action (action.title)}
              {#if action.condition(balance)}
                <button
                  class="text-xs font-medium w-44 h-12 flex items-center p-4 gap-x-2"
                  onclick={() => executeAction(action)}
                >
                  <img
                    src={action.icon}
                    alt={action.title}
                    class="w-4 h-4 inline"
                  />
                  {action.title}
                </button>
              {/if}
            {/each}
            <button
              class="text-xs font-medium w-44 h-12 flex items-center p-4 gap-x-2"
              onclick={handleCopy}
            >
              <img src={copyIcon} alt="Copy" class="w-4 h-4 inline" />
              Copy
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
