<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import type { Profile } from '@circles-sdk/profiles';
  import Avatar, { getProfile } from '$lib/components/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';
  import CommonConnections from '$lib/components/CommonConnections.svelte';
  import { shortenAddress } from '$lib/utils/shared';
  import type { Readable } from 'svelte/store';
  import type {ContactList, ExtendedTrustRelationRow} from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import { ensureContacts } from '../../routes/+layout.svelte';
  import Untrust from '$lib/pages/Untrust.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import SelectAsset from '$lib/flows/send/2_Asset.svelte';
  import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';

  let contacts:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  export let address: string | undefined;
  export let contentApi: PopupContentApi | undefined;
  export let trustVersion: number | undefined;

  onMount(async () => {
    contacts = await ensureContacts();
  });

  $: {
    if (address) {
      initialize(address);
    }
  }

  let otherAvatar: AvatarRow | undefined;
  let profile: Profile | undefined;
  let members: string[] | undefined = undefined;

  async function initialize(address?: string) {
    if (!address) {
      return;
    }
    if (!$circles) {
      return;
    }
    if (!$avatar) {
      return;
    }

    otherAvatar = await $circles.data.getAvatarInfo(address);
    if (otherAvatar) {
      profile = await getProfile(otherAvatar.avatar);
    }

    if (otherAvatar?.type === 'CrcV2_RegisterGroup') {
      // load the members
      const groupTrustRelations =
        await $circles.data.getAggregatedTrustRelations(otherAvatar.avatar);
      members = groupTrustRelations
        .filter((row) => row.relation === 'trusts')
        .map((o) => o.objectAvatar);
    } else {
      members = undefined;
    }

    if (!profile) {
      profile = {
        name: otherAvatar?.name ?? address,
      };
    }
  }

  function getTypeString(type: string | undefined) {
    if (!type) {
      return '';
    }
    if (type === 'CrcV2_RegisterHuman') {
      return 'Human';
    } else if (type === 'CrcV2_RegisterGroup') {
      return 'Group';
    } else if (type === 'CrcV2_RegisterOrganization') {
      return 'Organization';
    } else if (type === 'CrcV1_Signup') {
      return 'Human (v1)';
    }
    return '';
  }

  function getRelationText(row: ExtendedTrustRelationRow, profile?: Profile) {
    if (!row) {
      return `You don't trust each other`;
    }
    if (row.relation === 'mutuallyTrusts') {
      return `You accept each others tokens`;
    } else if (row.relation === 'trustedBy') {
      return `${profile?.name} accepts your tokens`;
    } else if (row.relation === 'trusts') {
      return `You accept ${profile?.name}'s tokens`;
    }

    throw new Error(`Unknown relation: ${row.relation}`);
  }

  // function newLineToBr(text: string) {
  //     return text.replace(/\n/g, "<br>");
  // }

  function getTrustRow(address: string | undefined) {
    if (!address) {
      return undefined;
    }
    if (!$contacts) {
      return undefined;
    }
    return $contacts.data[address]?.row;
  }

  function nextProfile(address: string) {
    contentApi?.open?.({
      title: shortenAddress(address),
      component: ProfilePage,
      props: {
        address: address,
        contentApi: contentApi,
      },
    });
  }

  let commonConnectionsCount = 0;
</script>

<div class="flex flex-col items-center">
  <Avatar
    view="vertical"
    clickable={false}
    address={otherAvatar?.avatar}
    {trustVersion}
  >
    <div class="mt-2">
      <span class="font-bold">{getTypeString(otherAvatar?.type)}</span> -
      <a
        class="font-medium"
        target="_blank"
        href={'https://gnosisscan.io/address/' + otherAvatar?.avatar}
      >
        {shortenAddress(otherAvatar?.avatar)}
      </a>
    </div>
  </Avatar>

  <span>
    {#if getTrustRow(otherAvatar?.avatar)?.relation === 'trusts'}
      <img src="/outgoing.svg" alt="Outgoing trust" class="w-3 h-3 inline" />
    {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy'}
      <img src="/incoming.svg" alt="Incoming trust" class="w-3 h-3 inline" />
    {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'}
      <img src="/mutual.svg" alt="Mutual trust" class="w-3 h-3 inline" />
    {:else}
      <img src="/no-trust.svg" alt="No trust" class="w-3 h-3 inline" />
    {/if}
    <span
      class="font-semibold"
      class:text-red-400={!(
        getTrustRow(otherAvatar?.avatar)?.relation === 'trusts' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'
      )}
      class:text-green-600={getTrustRow(otherAvatar?.avatar)?.relation ===
        'trusts' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'}
      >{getRelationText(getTrustRow(otherAvatar?.avatar), profile)}</span
    >
  </span>

  <!-- Updated Button Layout: Flex Row for Horizontal Alignment -->
  <div class="w-full flex justify-center space-x-4 p-4">
    {#if getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy' && otherAvatar.type === 'CrcV2_RegisterGroup'}
      <button
        class="btn btn-sm btn-round btn-outline"
        on:click={() => {
          contentApi?.open?.({
            title: 'Mint group tokens',
            component: MintGroupTokens,
            props: {
              address: address,
            },
          });
        }}
      >
        <img src="/banknotes.svg" alt="Incoming trust" class="w-6 h-6 inline" />
        Mint
      </button>
    {/if}
    <button
      class="btn btn-primary"
      on:click={() => {
        contentApi?.open?.({
          title: 'Send Circles',
          component: SelectAsset,
          props: {
            context: {
              selectedAddress: otherAvatar?.avatar,
            },
          },
        });
      }}
    >
      <img src="/send-fill.svg" alt="Send" class="w-3.5 h-3.5" /> Send
    </button>
    {#if getTrustRow(otherAvatar?.avatar)?.relation === 'trusts'}
      <button
        class="btn btn-primary btn-outline"
        on:click={() => {
          contentApi?.open?.({
            title: 'Untrust',
            component: Untrust,
            props: {
              address: address,
              trustVersion: trustVersion,
            },
          });
        }}
      >
        <img src="/trash.svg" alt="Untrust" class="w-4 h-4" />
        Untrust
      </button>
    {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'}
      <button
        class="btn btn-primary btn-outline"
        on:click={() => {
          contentApi?.open?.({
            title: 'Untrust',
            component: Untrust,
            props: {
              address: address,
            },
          });
        }}
      >
        <img src="/trash.svg" alt="Untrust" class="w-4 h-4" />
        Untrust
      </button>
    {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy'}
      <button
        class="btn btn-primary btn-outline"
        on:click={() => {
          contentApi?.open?.({
            title: 'Trust',
            component: Trust,
            props: {
              address: address,
            },
          });
        }}
      >
        <img src="/shield-check.svg" alt="Trust back" class="w-4 h-4" />
        Trust back
      </button>
    {:else}
      <button
        class="btn btn-primary btn-outline"
        on:click={() => {
          contentApi?.open?.({
            title: 'Trust',
            component: Trust,
            props: {
              address: address,
            },
          });
        }}
      >
        <img src="/shield-check.svg" alt="Trust" class="w-4 h-4" />
        Trust
      </button>
    {/if}
  </div>
</div>
<div class="p-6">
  <!--{#if profile?.description}-->
  <!--    <p class="menu-title pl-0">-->
  <!--        Description:-->
  <!--    </p>-->
  <!--    <p class="font-normal text-lg">-->
  <!--        {@html newLineToBr(profile?.description)}-->
  <!--    </p>-->
  <!--{/if}-->
  <div role="tablist" class="tabs tabs-lifted mt-6">
    <input
      type="radio"
      name="my_tabs_2"
      role="tab"
      class="tab"
      aria-label={`Common connections (${commonConnectionsCount})`}
      checked="checked"
    />
    <div
      role="tabpanel"
      class="tab-content bg-base-100 border-base-300 rounded-box p-6"
    >
      <CommonConnections
        {contentApi}
        otherAvatarAddress={otherAvatar?.avatar}
        bind:commonConnectionsCount
      />
    </div>
    {#if members}
      <input
        type="radio"
        name="my_tabs_2"
        role="tab"
        class="tab"
        aria-label={`Members (${members.length})`}
      />
      <div
        role="tabpanel"
        class="tab-content bg-base-100 border-base-300 rounded-box p-6"
      >
        <p class="menu-title pl-0">Members:</p>
        <ul>
          {#each members as member (member)}
            <li>
              <Avatar {contentApi} address={member}>
                {member}
              </Avatar>
            </li>
          {/each}
          {#if members.length === 0}
            <li>No members</li>
          {/if}
        </ul>
      </div>
    {/if}
  </div>
</div>
