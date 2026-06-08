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
  <div style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.05);margin-top:16px;border-radius:12px;overflow:hidden;">
    <div
      style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(31,17,70,0.05);cursor:pointer;user-select:none;"
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
      <div style="font-size:14px;color:rgba(15,10,30,0.62);">
        Events <span style="opacity:0.6;">({events.length})</span>
      </div>
      <div style="transition:transform 0.2s ease-out;color:rgba(15,10,30,0.62);transform:{eventsListOpen ? 'rotate(90deg)' : 'none'};">
        <Lucide icon={LArrowRight} size={14} />
      </div>
    </div>
    {#if eventsListOpen}
      <div style="display:flex;flex-direction:column;">
        {#each events as ev, i}
          <div style="padding:12px;{i > 0 ? 'border-top:1px solid rgba(31,17,70,0.05);' : ''}">
            <div
              style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;cursor:pointer;user-select:none;"
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
              <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                <div style="transition:transform 0.2s ease-out;color:rgba(15,10,30,0.62);transform:{isOpen(i) ? 'rotate(90deg)' : 'none'};">
                  <Lucide icon={LArrowRight} size={14} />
                </div>
                <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  {eventLabel(ev)} <span style="opacity:0.6;">#{i + 1}</span>
                </div>
              </div>
              <div style="font-size:11px;opacity:0.6;flex-shrink:0;">
                {#if eventLogIndex(ev) !== undefined}Log {eventLogIndex(ev)}{:else}{ev.$type ?? ev.eventType ?? ''}{/if}
              </div>
            </div>
            {#if isOpen(i)}
              <div style="margin-top:8px;overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                  <thead>
                    <tr>
                      <th style="width:160px;white-space:nowrap;opacity:0.7;text-align:left;padding:4px 6px;border-bottom:1px solid rgba(31,17,70,0.05);">Field</th>
                      <th style="text-align:left;padding:4px 6px;border-bottom:1px solid rgba(31,17,70,0.05);">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each eventDisplayEntries(ev) as [k, v]}
                      <tr>
                        <td style="white-space:nowrap;opacity:0.7;padding:4px 6px;vertical-align:middle;">{niceKey(k)}</td>
                        <td style="padding:4px 6px;vertical-align:middle;">
                          {#if v == null || v === undefined}
                            <span style="opacity:0.4;">—</span>
                          {:else if (k === 'Value' || k === 'value' || k === 'Cost' || k === 'cost') && formatAttoCircles(v)}
                            <span>{formatAttoCircles(v)}</span>
                          {:else if isAddress(v) || addressForDisplay(k, v)}
                            {#if addressForDisplay(k, v)}
                              <div style="display:inline-flex;align-items:center;gap:8px;">
                                <Avatar address={addressForDisplay(k, v)} view="small" clickable={true} />
                              </div>
                            {:else}
                              <span style="font-family:monospace;word-break:break-all;">{String(v)}</span>
                            {/if}
                          {:else}
                            <span style="font-family:monospace;word-break:break-all;">
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
