<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { ArrowRight as LArrowRight, Flame as LFlame } from 'lucide';
  import { safeStringify } from '$lib/shared/utils/json';
  import { addressForDisplay, formatAttoCircles, isAddress } from '$lib/shared/utils/tx';

  export type TxEvent = Record<string, any> & { $type?: string; eventType?: string; logIndex?: number; LogIndex?: number };

  interface Props {
    events: TxEvent[];
    eventDisplayEntries: (ev: TxEvent) => [string, any][];
    niceKey: (k: string) => string;
    isOpen: (i: number) => boolean;
    toggleOpen: (i: number) => void;
    eventsListOpen: boolean;
    toggleEventsList: () => void;
  }
  let {
    events,
    eventDisplayEntries,
    niceKey,
    isOpen,
    toggleOpen,
    eventsListOpen,
    toggleEventsList,
  }: Props = $props();

  /** Strip CrcV2_/Crc_ prefix and split PascalCase into readable words */
  function eventLabel(ev: TxEvent): string {
    const raw = ev.$type ?? ev.eventType;
    if (!raw) return 'Event';
    return raw
      .replace(/^CrcV2_/, '')
      .replace(/^Crc_/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }

  function eventLogIndex(ev: TxEvent): number | undefined {
    return ev.LogIndex ?? ev.logIndex;
  }
</script>

{#if events.length}
  <div class="bg-base-100 border mt-4 rounded-xl overflow-hidden">
    <div
      class="flex items-center justify-between p-3 border-b cursor-pointer select-none"
      role="button"
      tabindex="0"
      aria-expanded={eventsListOpen}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleEventsList();
        }
      }}
      onclick={toggleEventsList}
    >
      <div class="text-sm opacity-70">
        Events <span class="opacity-60">({events.length})</span>
      </div>
      <div class="transition-transform duration-200 text-base-content/70 {eventsListOpen ? 'rotate-90' : ''}">
        <Lucide icon={LArrowRight} size={14} />
      </div>
    </div>
    {#if eventsListOpen}
      <div class="divide-y">
        {#each events as ev, i}
          <div class="p-3">
            <div
              class="flex items-center justify-between mb-1 cursor-pointer select-none"
              role="button"
              tabindex="0"
              aria-expanded={isOpen(i)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleOpen(i);
                }
              }}
              onclick={() => toggleOpen(i)}
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="transition-transform duration-200 text-base-content/70 {isOpen(i) ? 'rotate-90' : ''}">
                  <Lucide icon={LArrowRight} size={14} />
                </div>
                <div class="text-sm font-medium truncate">
                  {eventLabel(ev)} <span class="opacity-60">#{i + 1}</span>
                </div>
              </div>
              <div class="text-xs opacity-40 shrink-0">
                {ev.$type ?? ev.eventType ?? ''}
              </div>
            </div>
            {#if isOpen(i)}
              <div class="mt-2 overflow-x-auto">
                <table class="table table-xs text-xs">
                  <thead>
                    <tr>
                      <th class="w-40 whitespace-nowrap opacity-70">Field</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each eventDisplayEntries(ev) as [k, v]}
                      <tr>
                        <td class="whitespace-nowrap opacity-70">{niceKey(k)}</td>
                        <td class="align-middle">
                          {#if v == null || v === undefined}
                            <span class="opacity-40">—</span>
                          {:else if (k === 'Value' || k === 'value' || k === 'Cost' || k === 'cost') && formatAttoCircles(v)}
                            <span>{formatAttoCircles(v)}</span>
                          {:else if isAddress(v) || addressForDisplay(k, v)}
                            {#if addressForDisplay(k, v)}
                              <div class="inline-flex items-center gap-2">
                                <Avatar address={addressForDisplay(k, v)} view="small" clickable={true} />
                              </div>
                            {:else}
                              <span class="font-mono break-all">{String(v)}</span>
                            {/if}
                          {:else}
                            <span class="font-mono break-all">
                              {typeof v === 'object' ? safeStringify(v, 0) : String(v)}
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
