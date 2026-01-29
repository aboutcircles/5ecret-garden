<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import type { Profile, ProfileView } from '@aboutcircles/sdk-types';
  import CommonConnections from '$lib/components/CommonConnections.svelte';
  import { contacts } from '$lib/stores/contacts';
  import {
    type AvatarInfo,
    type TrustRelation,
    type TrustRelationType,
    type AggregatedTrustRelation,
  } from '@aboutcircles/sdk-types';
  import Untrust from '$lib/pages/Untrust.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import SelectAsset from '$lib/flows/send/2_Asset.svelte';
  import { getProfile } from '$lib/utils/profile';
  import { formatTrustRelation, getTypeString } from '$lib/utils/helpers';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import AddressComponent from '$lib/components/Address.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import SelectAmount from '$lib/flows/send/3_Amount.svelte';
  import { transitiveTransfer } from '$lib/pages/SelectAsset.svelte';
  import CollateralTable from '$lib/components/CollateralTable.svelte';
  import TokenHoldersList from '$lib/components/TokenHoldersList.svelte';
  import { goto } from '$app/navigation';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { getProfileView as fetchProfileView } from '$lib/utils/sdkHelpers';

  /* NEW: tabs */
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';

  interface Props {
    address: Address | undefined;
  }

  let { address }: Props = $props();

  $effect(() => {
    const hasAddress: boolean = !!address;
    if (hasAddress) {
      initialize(address as Address);
    }
  });

  let otherAvatar: AvatarInfo | undefined = $state();
  let profile: Profile | undefined = $state();

  // Derived: detect if this is a group from avatar type OR profile description
  let isGroupProfile = $derived(
    otherAvatar?.type === 'CrcV2_RegisterGroup' ||
    profile?.description?.toLowerCase().includes('member of this group')
  );

  let members: Array<{ address: Address; expiryTime: number }> | undefined =
    $state(undefined);
  let totalMemberCount: number = $state(0);
  let memberQuery: any = $state(undefined);
  let loadingMoreMembers: boolean = $state(false);
  let hasMoreMembers: boolean = $state(true);
  let mintHandler: Address | undefined = $state();

  let trustRow: AggregatedTrustRelation | undefined = $state();
  let collateralInTreasury: Array<{
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelationType;
  }> = $state([]);

  let tokenHolders: Array<{
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelation;
  }> = $state([]);

  async function loadMoreMembers() {
    if (!memberQuery || loadingMoreMembers || !hasMoreMembers) {
      return;
    }

    // Check if there are more pages to load
    if (memberQuery.currentPage && !memberQuery.currentPage.hasMore) {
      hasMoreMembers = false;
      return;
    }

    loadingMoreMembers = true;
    try {
      console.log('Loading next page of members...');
      const hasResults = await memberQuery.queryNextPage();

      if (hasResults && memberQuery.currentPage) {
        const memberRows = memberQuery.currentPage.results;
        const newMembers = memberRows.map((row: any) => ({
          address: row.member,
          expiryTime: row.expiryTime,
        }));

        console.log(
          `Loaded ${newMembers.length} members (hasMore: ${memberQuery.currentPage.hasMore})`
        );

        members = [...(members || []), ...newMembers];
        hasMoreMembers = memberQuery.currentPage.hasMore;
      } else {
        hasMoreMembers = false;
      }
    } catch (error) {
      console.error('Error loading more members:', error);
      hasMoreMembers = false;
    } finally {
      loadingMoreMembers = false;
    }
  }

  async function initialize(address: Address) {
    const hasCircles: boolean = !!$circles;
    if (!hasCircles) {
      return;
    }

    // Reset pagination state
    members = undefined;
    totalMemberCount = 0;
    memberQuery = undefined;
    hasMoreMembers = true;
    loadingMoreMembers = false;

    // Use getProfileView - single RPC call instead of multiple
    console.log('Using optimized getProfileView() - single RPC call');

    const profileView = await fetchProfileView($circles!, address);
    otherAvatar = profileView.avatarInfo;

    // Fallback: fetch avatar info directly if not in profile view or missing type
    if (!otherAvatar?.type) {
      try {
        const avatarInfo = await ($circles as any).rpc.avatar.getAvatarInfo(address);
        if (avatarInfo) {
          otherAvatar = avatarInfo;
          console.log('Fetched avatar info via fallback:', avatarInfo.type);
        }
      } catch (e) {
        console.warn('Failed to fetch avatar info fallback:', e);
      }
    }

    profile = profileView.profile ?? await getProfile(address); // Fallback if no profile in view

    trustRow = $contacts?.data[address]?.row;

    // Detect group/human from type OR from profile description (fallback when type is missing)
    const descriptionSuggestsGroup = profile?.description?.toLowerCase().includes('member of this group');
    const isGroup: boolean = otherAvatar?.type === 'CrcV2_RegisterGroup' || descriptionSuggestsGroup;
    const isHuman: boolean = otherAvatar?.type === 'CrcV2_RegisterHuman';

    console.log('Profile initialization:', {
      address,
      type: otherAvatar?.type,
      isGroup,
      isHuman,
      descriptionSuggestsGroup,
    });

    if (isGroup) {
      // Fetch group info directly for the specific group being viewed
      const groupInfoP = (async () => {
        try {
          console.log('Fetching group info directly for address:', address);
          // Use findGroups with groupAddressIn filter to get the specific group
          const groups = await ($circles as any).rpc.group.findGroups(1, {
            groupAddressIn: [address],
          });
          console.log('Group data:', groups);

          if (groups && groups.length > 0) {
            const groupData = groups[0];
            if (groupData.memberCount !== undefined) {
              console.log(
                'Found group with memberCount:',
                groupData.memberCount
              );
              totalMemberCount = groupData.memberCount;
              return groupData;
            }
          } else {
            console.warn('Group not found');
          }

          return null;
        } catch (error) {
          console.error('Error fetching group info:', error);
          return null;
        }
      })();
      const membersP = (async () => {
        try {
          console.log(
            'Using new SDK sdk.groups.getMembers() for group:',
            otherAvatar!.avatar
          );
          // Create a PagedQuery instance for group members
          memberQuery = ($circles as any).groups.getMembers(
            otherAvatar!.avatar,
            100,
            'DESC'
          );

          // Fetch first page
          const hasResults = await memberQuery.queryNextPage();
          if (hasResults && memberQuery.currentPage) {
            const memberRows = memberQuery.currentPage.results;
            console.log('Members data (first page):', memberRows);
            const mappedMembers = memberRows.map((row: any) => ({
              address: row.member,
              expiryTime: row.expiryTime,
            }));
            console.log('Mapped members:', mappedMembers);
            hasMoreMembers = memberQuery.currentPage.hasMore;
            return mappedMembers;
          }
          return [];
        } catch (error) {
          console.error('Error fetching members:', error);
          return [];
        }
      })();

      const mintHandlerP = (async () => {
        try {
          console.log('Using SDK rpc.group.getMintHandler()');
          // Use RPC to get mint handler for the group being viewed
          if ($circles && otherAvatar?.avatar) {
            return await ($circles as any).rpc.group.getMintHandler(otherAvatar.avatar);
          }
          return undefined;
        } catch (error) {
          console.error('Error fetching mint handler:', error);
          return undefined;
        }
      })();

      const collateralP = (async () => {
        try {
          console.log(
            'Using SDK sdk.groups.getCollateral() for group:',
            otherAvatar!.avatar
          );
          const collateralTokens = await ($circles as any).groups.getCollateral(
            otherAvatar!.avatar
          );
          console.log('Collateral data:', collateralTokens);
          const filtered = collateralTokens.filter(
            (token: any) => token.isErc1155
          );
          console.log('Filtered collateral (ERC1155 only):', filtered);
          return filtered
            .map((token: any) => ({
              avatar: token.tokenAddress,
              amount: token.attoCircles,
              amountToRedeemInCircles: 0,
              amountToRedeem: 0n,
            }))
            .sort((a: any, b: any) =>
              a.amount > b.amount ? -1 : a.amount === b.amount ? 0 : 1
            );
        } catch (error) {
          console.error('Error fetching collateral:', error);
          return [];
        }
      })();

      // Token holders are now loaded directly by the TokenHoldersList component with pagination
      const tokenHoldersP = (async () => {
        return [];
      })();

      const [
        membersResult,
        mintHandlerResult,
        collateralResult,
        tokenHoldersResult,
        _groupInfoResult,
      ] = await Promise.all([
        membersP,
        mintHandlerP,
        collateralP,
        tokenHoldersP,
        groupInfoP,
      ]);

      members = membersResult;
      mintHandler = mintHandlerResult;
      collateralInTreasury = collateralResult;
      tokenHolders = tokenHoldersResult;
      // _groupInfoResult already set totalMemberCount in the promise

      console.log('Final group data loaded:');
      console.log('  - Total member count:', totalMemberCount);
      console.log('  - Members loaded:', members?.length, members);
      console.log(
        '  - Collateral:',
        collateralInTreasury?.length,
        collateralInTreasury
      );
      console.log('  - Token holders:', tokenHolders?.length, tokenHolders);
    } else {
      members = undefined;
      // Token holders for humans are now loaded directly by the TokenHoldersList component with pagination
      tokenHolders = [];
    }
  }

  let selectedTab: string = $state('common_connections');
  let commonConnectionsCount = $state(0);
</script>

<div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto">
  <Avatar view="vertical" clickable={false} {address} />

  {#if trustRow}
    <span
      class="text-sm"
      class:text-green-600={trustRow?.relation === 'trusts' ||
        trustRow?.relation === 'trustedBy' ||
        trustRow?.relation === 'mutuallyTrusts'}
    >
      {formatTrustRelation(trustRow.relation, profile)}
    </span>
  {:else}
    <span class="text-sm text-gray-500">No relation available</span>
  {/if}

  <div class="my-6 flex flex-row gap-x-2">
    {#if isGroupProfile}
      <span class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm">Group</span>
    {:else if otherAvatar?.type}
      {@const typeStr = getTypeString(otherAvatar.type)}
      {#if typeStr && typeStr !== 'None' && typeStr !== 'Unknown' && typeStr !== ''}
        <span class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm">
          {typeStr}
        </span>
      {/if}
    {/if}
    <AddressComponent address={address ?? '0x0'} />
    {#if isGroupProfile}
      <button
        onclick={() => {
          goto('/groups/metrics/' + address);
          popupControls.close();
        }}
        class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
      >
        <img src="/chart.svg" alt="Chart" class="w-4" />
      </button>
    {/if}
    <a
      href={'https://gnosisscan.io/address/' + otherAvatar?.avatar}
      target="_blank"
      class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
    >
      <img src="/external.svg" alt="External Link" class="w-4" />
    </a>
  </div>

  <div class="w-[80%] sm:w-[60%] border-b border-[#E5E7EB]"></div>

  <div class="w-full flex justify-center mt-6 space-x-6">
    {#if !avatarState.isGroup}
      <button
        class="btn btn-primary text-white"
        onclick={() => {
          popupControls.open({
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
        <img src="/send-new.svg" alt="Send" class="w-5 h-5" />
        Send
      </button>
    {/if}
    {#if otherAvatar?.type === 'CrcV2_RegisterGroup' && !!mintHandler && !avatarState.isGroup}
      <button
        class="btn bg-[#F3F4F6] border-none"
        onclick={() => {
          popupControls.open({
            title: 'Enter Amount',
            component: SelectAmount,
            props: {
              asset: transitiveTransfer(),
              selectedAddress: mintHandler,
              transitiveOnly: true,
              amount: 0,
              context: {
                selectedAddress: mintHandler,
                transitiveOnly: true,
                selectedAsset: transitiveTransfer(),
                amount: 0,
                useWrappedBalances: true,
              },
            },
          });
        }}
      >
        Mint
      </button>
    {/if}
    {#if trustRow?.relation === 'trusts'}
      <button
        class="btn bg-[#F3F4F6] border-none"
        onclick={() => {
          popupControls.open({
            title: !avatarState.isGroup ? 'Untrust' : 'Remove member',
            component: Untrust,
            props: {
              address: address,
            },
          });
        }}
      >
        {!avatarState.isGroup ? 'Untrust' : 'Remove member'}
      </button>
    {:else if trustRow?.relation === 'mutuallyTrusts'}
      <button
        class="btn bg-[#F3F4F6] border-none"
        onclick={() => {
          popupControls.open({
            title: !avatarState.isGroup ? 'Untrust' : 'Remove member',
            component: Untrust,
            props: {
              address: address,
            },
          });
        }}
      >
        {!avatarState.isGroup ? 'Untrust' : 'Remove member'}
      </button>
    {:else if trustRow?.relation === 'trustedBy'}
      <button
        class="btn bg-[#F3F4F6] border-none"
        onclick={() => {
          popupControls.open({
            title: !avatarState.isGroup ? 'Trust back' : 'Add member',
            component: Trust,
            props: {
              address: address,
            },
          });
        }}
      >
        {!avatarState.isGroup ? 'Trust back' : 'Add as member'}
      </button>
    {:else}
      <button
        class="btn bg-[#F3F4F6] border-none"
        onclick={() => {
          popupControls.open({
            title: !avatarState.isGroup ? 'Trust' : 'Add as member',
            component: Trust,
            props: {
              address: address,
            },
          });
        }}
      >
        {!avatarState.isGroup ? 'Trust' : 'Add as member'}
      </button>
    {/if}
  </div>
</div>

<Tabs
  id="profile-tabs"
  bind:selected={selectedTab}
  variant="lifted"
  size="md"
  class="w-full p-0 mt-8"
  fitted={false}
>
  <Tab
    id="common_connections"
    title="Common connections"
    badge={commonConnectionsCount}
    panelClass="p-4 bg-base-100 border-none"
  >
    <div class="w-full">
      <CommonConnections
        otherAvatarAddress={otherAvatar?.avatar}
        bind:commonConnectionsCount
      />
    </div>
  </Tab>

  {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
    <Tab
      id="members"
      title="Members"
      badge={totalMemberCount || 0}
      panelClass="p-4 bg-base-100 border-none"
    >
      {#if totalMemberCount > 0}
        <div class="mb-4 text-sm text-gray-600">
          Total members: {totalMemberCount}
          {#if members}
            · Loaded: {members.length}
          {/if}
        </div>
      {/if}
      <div
        onscroll={(e) => {
          const target = e.currentTarget;
          const scrollPosition = target.scrollTop + target.clientHeight;
          const scrollThreshold = target.scrollHeight - 200;

          if (
            scrollPosition >= scrollThreshold &&
            hasMoreMembers &&
            !loadingMoreMembers
          ) {
            loadMoreMembers();
          }
        }}
        class="max-h-[600px] overflow-y-auto"
      >
        {#if members && members.length > 0}
          {#each members as member (member.address)}
            <RowFrame
              clickable={true}
              noLeading
              on:click={async () => {
                            // Open another Profile instance in a popup (same UX as groups/contacts lists)
                            const ProfilePage = (await import('$lib/pages/Profile.svelte')).default;
                            popupControls.open({ title: 'Profile', component: ProfilePage, props: { address: member.address } });
                          }}
            >
              <div class="min-w-0">
                <Avatar
                  address={member.address}
                  view="horizontal"
                  clickable={false}
                />
              </div>
              <div slot="trailing" class="font-medium underline flex gap-x-2">
                <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
              </div>
            </RowFrame>
          {/each}
          {#if loadingMoreMembers}
            <div class="p-4 text-center text-gray-500">
              Loading more members...
            </div>
          {/if}
          {#if !hasMoreMembers && members.length < totalMemberCount}
            <div class="p-4 text-center text-gray-500">
              All members loaded ({members.length} of {totalMemberCount})
            </div>
          {/if}
        {:else if members && members.length === 0}
          <div class="p-4 text-center text-gray-500">No members</div>
        {:else}
          <div class="p-4 text-center text-gray-500">Loading members...</div>
        {/if}
      </div>
    </Tab>
  {/if}

  {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
    <Tab
      id="collateral"
      title="Collateral"
      badge={collateralInTreasury?.length || 0}
      panelClass="p-4 bg-base-100 border-none"
    >
      <div class="w-full">
        {#if collateralInTreasury && collateralInTreasury.length > 0}
          <CollateralTable {collateralInTreasury} />
        {:else if collateralInTreasury && collateralInTreasury.length === 0}
          <div class="p-4 text-center text-gray-500">No collateral tokens</div>
        {:else}
          <div class="p-4 text-center text-gray-500">Loading collateral...</div>
        {/if}
      </div>
    </Tab>
  {/if}

  {#if otherAvatar?.type === 'CrcV2_RegisterGroup' || otherAvatar?.type === 'CrcV2_RegisterHuman' || otherAvatar?.type === 'CrcV2_RegisterOrganization'}
    <Tab id="holders" title="Holders" panelClass="p-4 bg-base-100 border-none">
      {#if otherAvatar}
        <TokenHoldersList
          tokenAddress={otherAvatar.avatar}
          isPersonalToken={otherAvatar.type === 'CrcV2_RegisterHuman' ||
            otherAvatar.type === 'CrcV2_RegisterOrganization'}
        />
      {:else}
        <div class="p-4 text-center text-gray-500">Loading holders...</div>
      {/if}
    </Tab>
  {/if}
</Tabs>
