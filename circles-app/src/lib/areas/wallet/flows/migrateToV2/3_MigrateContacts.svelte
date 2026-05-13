<script lang="ts">
  import { onMount } from 'svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { MIGRATE_FLOW_SCAFFOLD_BASE } from './constants';
  import type { MigrateToV2Context } from '$lib/areas/wallet/flows/migrateToV2/context';
  import Migrate from './4_Migrate.svelte';
  import { contacts } from '$lib/shared/state/contacts';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { openStep } from '$lib/shared/flow';
  import type { ReviewStepProps } from '$lib/shared/flow';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { T } from '$lib/design-system/tokens.js';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';
  import { writable } from 'svelte/store';

  type Props = ReviewStepProps<MigrateToV2Context>;

  let { context = $bindable() }: Props = $props();

  let selectedAddresses: string[] = $state([]);
  let searchInputEl: HTMLInputElement | null = $state(null);
  let contactsListEl: HTMLDivElement | null = $state(null);
  const contactStore = writable<string[]>([]);

  onMount(async () => {
    selectedAddresses = context.trustList ?? Object.keys($contacts?.data ?? {});
  });

  async function next() {
    openStep({
      title: 'Run Migration',
      component: Migrate,
      props: {
        context: context,
      },
    });
  }

  let orderedContacts = $derived(Object.keys($contacts?.data ?? {}).sort((a, b) => {
    /*
            // Alphabetical sorting by contact name
            const aRelation = $contacts?.data[a]?.contactProfile?.name;
            const bRelation = $contacts?.data[b]?.contactProfile?.name;
            return aRelation.localeCompare(bRelation);
         */
    const aRelation = $contacts?.data[a].row.relation;
    const bRelation = $contacts?.data[b].row.relation;
    if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts') {
      return -1;
    }
    if (aRelation === 'trusts' && bRelation === 'trustedBy') {
      return -1;
    }
    if (aRelation === bRelation) {
      return 0;
    }
    if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts') {
      return 1;
    }
    if (bRelation === 'trusts' && aRelation === 'trustedBy') {
      return 1;
    }
    return 0;
  }));

  $effect(() => {
    contactStore.set(orderedContacts);
  });

  const searchable = createSearchablePaginatedList(contactStore, {
    pageSize: 100,
    addressOf: (address) => address,
  });
  const { searchQuery, filteredItems } = searchable;

  function toggleSelected(address: string, checked: boolean) {
    if (checked) {
      selectedAddresses = selectedAddresses.includes(address)
        ? selectedAddresses
        : [...selectedAddresses, address];
    } else {
      selectedAddresses = selectedAddresses.filter((value) => value !== address);
    }
    context.trustList = selectedAddresses;
  }

  function onToggleSelectedFromCheckbox(address: string, event: Event) {
    const el = event.currentTarget as HTMLInputElement | null;
    toggleSelected(address, Boolean(el?.checked));
  }

  function focusSearchInput() {
    searchInputEl?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(contactsListEl?.querySelectorAll<HTMLElement>('[data-migrate-contact-row]') ?? []),
    focusInput: focusSearchInput,
    onActivateRow: (row) => {
      const address = row.dataset.migrateContactAddress;
      if (!address) return;
      toggleSelected(address, !selectedAddresses.includes(address));
    },
  });

  function onRowClick(event: MouseEvent) {
    listNavigator.onRowClick(event);
  }
</script>
<FlowStepScaffold
  {...MIGRATE_FLOW_SCAFFOLD_BASE}
  step={3}
  title="Migrate contacts"
  subtitle="Choose which trusted contacts to migrate to V2."
>

  <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">
    Select the contacts to keep in your new Circles V2 profile.
  </p>

  <div role="group" aria-label="Migrate contacts list">
    <ListShell
      query={searchQuery}
      searchPlaceholder="Search by address or name"
      bind:inputEl={searchInputEl}
      onInputKeydown={listNavigator.onInputArrowDown}
      loading={false}
      error={null}
      isEmpty={orderedContacts.length === 0}
      ended={$contacts?.ended ?? false}
      emptyRequiresEnd={true}
      isNoMatches={orderedContacts.length > 0 && $filteredItems.length === 0}
      emptyLabel="No contacts to migrate"
      noMatchesLabel="No matches"
      wrapInListContainer={false}
      data-contacts-list-scope
    >
      <div
        bind:this={contactsListEl}
        style="display:flex;flex-direction:column;gap:4px;margin-top:6px;"
        role="list"
      >
        {#each $filteredItems as address (address)}
          {@const isSelected = selectedAddresses.includes(address)}
          <div
            tabindex={0}
            data-migrate-contact-row
            data-migrate-contact-address={address}
            onkeydown={listNavigator.onRowKeydown}
            onclick={onRowClick}
            role="button"
            aria-pressed={isSelected ? 'true' : 'false'}
            aria-label={`Contact ${address}`}
            style="
              padding:10px 12px;border-radius:12px;cursor:pointer;
              background:{isSelected ? T.primaryFaint : T.surface};
              border:1px solid {isSelected ? 'rgba(88,73,212,0.2)' : T.hairlineSoft};
              display:flex;align-items:center;justify-content:space-between;gap:10px;
              transition:background .1s ease-out,border-color .1s ease-out;
            "
          >
            <div style="min-width:0;flex:1;">
              <Avatar
                {address}
                clickable={false}
                view="horizontal"
                bottomInfo={formatTrustRelation($contacts?.data[address].row.relation)}
                showTypeInfo={true}
              />
            </div>
            <input
              type="checkbox"
              style="width:16px;height:16px;accent-color:{T.primary};flex-shrink:0;cursor:pointer;"
              checked={isSelected}
              onchange={(event) => onToggleSelectedFromCheckbox(address, event)}
            />
          </div>
        {/each}
      </div>
    </ListShell>
  </div>

  <div style="display:flex;justify-content:flex-end;margin-top:8px;">
    <button
      type="submit"
      style="
        height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:pointer;
        background:{T.primary};color:#fff;
        font-family:{T.fontSans};font-size:14px;font-weight:580;
        box-shadow:0 4px 12px rgba(88,73,212,0.25);
      "
      onclick={() => next()}
    >Continue</button>
  </div>
</FlowStepScaffold>
