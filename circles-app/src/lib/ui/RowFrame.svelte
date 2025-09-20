<script lang="ts">
    interface Props {
        clickable?: boolean;
        selected?: boolean;
        disabled?: boolean;
        dense?: boolean;
        className?: string;
        /** Collapse the leading column for rows whose content already includes its own avatar/layout. */
        noLeading?: boolean;
    }

    let {
        clickable = false,
        selected = false,
        disabled = false,
        dense = false,
        className = '',
        noLeading = false
    }: Props = $props();

    let el: HTMLElement;

    function handleKeydown(e: KeyboardEvent): void {
        if (!clickable || disabled) return;
        const isActivate = e.key === 'Enter' || e.key === ' ';
        if (isActivate) {
            e.preventDefault();
            el?.click();
        }
    }
</script>

<div
        bind:this={el}
        data-row
        data-clickable={clickable ? '' : undefined}
        data-selected={selected ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-dense={dense ? '' : undefined}
        data-no-leading={noLeading ? '' : undefined}
        class={`ui-row ${className}`}
        role={clickable ? 'button' : 'group'}
        tabindex={clickable && !disabled ? 0 : undefined}
        aria-disabled={disabled ? 'true' : 'false'}
        on:keydown={handleKeydown}
>
    {#if !noLeading}
        <div class="ui-row__leading">
            <slot name="leading" />
        </div>
    {/if}

    <div class="ui-row__content">
        <div class="ui-row__title"><slot name="title" /></div>
        <div class="ui-row__subtitle"><slot name="subtitle" /></div>
        <div class="ui-row__meta"><slot name="meta" /></div>
        <slot />
    </div>

    <div class="ui-row__trailing">
        <slot name="trailing" />
    </div>
</div>

<style>
    .ui-row {
        --row-height: var(--row-height-md);
        --row-pad-x: var(--row-pad-x-md);
        --row-pad-y: var(--row-pad-y-md);

        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;

        width: 100%;
        min-height: var(--row-height);
        box-sizing: border-box;

        padding: var(--row-pad-y) var(--row-pad-x);
        gap: var(--row-gap);

        background: var(--row-bg);
        border: 1px solid var(--row-border);
        border-radius: var(--row-radius);

        transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 80ms ease;
    }

    /* collapse leading column when requested */
    .ui-row[data-no-leading] {
        grid-template-columns: 1fr auto;
    }

    .ui-row[data-clickable] { cursor: pointer; }
    .ui-row[data-clickable]:hover { background: var(--row-bg-hover); border-color: var(--row-border-hover); }
    .ui-row[data-clickable]:active { transform: translateY(0.5px); }
    .ui-row:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--row-focus-ring); }

    .ui-row[data-selected] {
        background: var(--row-bg-selected);
        border-color: var(--row-border-selected);
        box-shadow: 0 0 0 2px var(--row-border-selected) inset;
    }

    .ui-row[data-disabled] { opacity: 0.6; pointer-events: none; }

    .ui-row[data-dense] {
        --row-height: var(--row-height-sm);
        --row-pad-x: var(--row-pad-x-sm);
        --row-pad-y: var(--row-pad-y-sm);
    }

    .ui-row__leading { display: flex; align-items: center; gap: var(--row-gap); }
    .ui-row__trailing { display: flex; align-items: center; gap: var(--row-gap); }
    .ui-row__content {
        min-width: 0;
        display: grid;
        grid-template-rows: auto auto auto;
        gap: 2px;
    }
    .ui-row__title, .ui-row__subtitle, .ui-row__meta {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ui-row__title { font-weight: 600; color: var(--row-fg-strong); }
    .ui-row__subtitle { font-size: 0.875rem; color: var(--row-fg-muted); }
    .ui-row__meta { font-size: 0.75rem; color: var(--row-fg-muted-2); }
</style>
