<script lang="ts">
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { crcTypes, roundToDecimals, staticTypes } from '$lib/utils/shared';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import WrapTokens from '$lib/pages/WrapTokens.svelte';
  import MigrateTokens from '$lib/pages/MigrateTokens.svelte';
  import UnwrapTokens from '$lib/pages/UnwrapTokens.svelte';
  import ExitGroup from '$lib/pages/ExitGroup.svelte';
  import Avatar from './avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUpStore';

  export let balance: TokenBalanceRow;
</script>

<div class="flex items-center justify-between pt-2 rounded-lg">
  <Avatar
    address={balance.tokenOwner}
    view="horizontal"
    clickable={false}
    bottomInfo={tokenTypeToString(balance.tokenType)}
  ></Avatar>

  <div class="flex md:flex-row-reverse gap-x-2 md:gap-x-4">
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

    <div class="max-sm:dropdown max-sm:dropdown-end">
      <div
        tabIndex={0}
        role="button"
        class="btn md:hidden btn-circle btn-ghost btn-xs text-info"
      >
        <img src="/union.svg" alt="Union" class="w-4 h-4" />
      </div>
      <div
        tabIndex={0}
        class="dropdown-content bg-base-100 rounded-box shadow md:shadow-none"
      >
        {#if balance.tokenType == 'CrcV2_RegisterHuman' || balance.tokenType == 'CrcV2_RegisterGroup' || balance.tokenType == 'CrcV2_RegisterGroup'}
          <button
            tabIndex={0}
            class="md:btn md:btn-xs md:btn-round text-xs font-medium w-44 md:w-auto h-12 md:h-auto flex md:block items-center max-sm:p-4 gap-x-2"
            on:click={() => {
              popupControls.open?.({
                title: 'Wrap Circles',
                component: WrapTokens,
                props: {
                  asset: balance,
                },
              });
            }}
          >
            <img src="/banknotes.svg" alt="Wrap" class="w-4 h-4 inline" />
            Wrap
          </button>
        {/if}
        {#if balance.tokenType == 'CrcV2_RegisterGroup'}
          <button
            class="btn btn-xs btn-round text-xs font-medium"
            on:click={() => {
              popupControls.open?.({
                title: 'Exit group',
                component: ExitGroup,
                props: {
                  asset: balance,
                },
              });
            }}
          >
            <img src="/exit.svg" alt="Wrap" class="w-4 h-4 inline" />
            Exit
          </button>
        {/if}
        {#if balance.tokenType == 'CrcV1_Signup' && $avatar?.avatarInfo && $avatar?.avatarInfo?.version > 1}
          <button
            class="btn btn-xs btn-round text-xs font-medium"
            on:click={() => {
              popupControls.open?.({
                title: 'Migrate Tokens to V2',
                component: MigrateTokens,
                props: {
                  asset: balance,
                },
              });
            }}
          >
            <img
              src="/banknotes.svg"
              alt="Incoming trust"
              class="w-4 h-4 inline"
            />
            Migrate to V2
          </button>
        {/if}
        {#if balance.tokenType == 'CrcV2_ERC20WrapperDeployed_Demurraged'}
          <button
            class="btn btn-xs btn-round text-xs font-medium"
            on:click={() => {
              popupControls.open?.({
                title: 'Unwrap Circles',
                component: UnwrapTokens,
                props: {
                  asset: balance,
                },
              });
            }}
          >
            <img src="/banknotes.svg" alt="Wrap" class="w-4 h-4 inline" />
            Unwrap
          </button>
        {/if}
        {#if balance.tokenType == 'CrcV2_ERC20WrapperDeployed_Inflationary'}
          <button
            class="btn btn-xs btn-round text-xs font-medium"
            on:click={() => {
              popupControls.open?.({
                title: 'Unwrap Static Circles',
                component: UnwrapTokens,
                props: {
                  asset: balance,
                },
              });
            }}
          >
            <img src="/banknotes.svg" alt="Wrap" class="w-4 h-4 inline" />
            Unwrap
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
