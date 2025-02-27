<script lang="ts">
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatar, isGroup } from '$lib/stores/avatar';
  import { crcTypes, roundToDecimals, staticTypes } from '$lib/utils/shared';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import WrapTokens from '$lib/pages/WrapTokens.svelte';
  import MigrateTokens from '$lib/pages/MigrateTokens.svelte';
  import UnwrapTokens from '$lib/pages/UnwrapTokens.svelte';
  import ExitGroup from '$lib/pages/ExitGroup.svelte';
  import Avatar from './avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';

  export let balance: TokenBalanceRow;

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
      title: 'Exit group',
      icon: '/exit.svg',
      component: ExitGroup,
    },
    {
      condition: (balance: TokenBalanceRow) =>
        balance.tokenType === 'CrcV1_Signup' &&
        !!$avatar?.avatarInfo &&
        $avatar?.avatarInfo?.version > 1,
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
</script>

<div class="w-full pt-2">
  <div class="w-full flex items-center justify-between p-2 rounded-lg">
    <Avatar
      address={balance.tokenOwner}
      view="horizontal"
      clickable={false}
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

      {#if !$isGroup}
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
            class="dropdown-content bg-base-100 rounded-box shadow"
          >
            {#each actions as action (action.title)}
              {#if action.condition(balance)}
                <button
                  class="text-xs font-medium w-44 h-12 flex items-center p-4 gap-x-2"
                  on:click={() => executeAction(action)}
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
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
