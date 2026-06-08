<script lang="ts">
  import { T } from './tokens.js';
  import Icon from './Icon.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: Snippet;
  }

  let { title, subtitle, eyebrow, actions }: Props = $props();
</script>

<div style="
  display: flex; align-items: flex-start; gap: 24px;
  padding: 28px 36px 22px;
  border-bottom: 1px solid {T.hairlineSoft};
  background: {T.page};
">
  <div style="flex: 1; min-width: 0;">
    {#if eyebrow}
      <div style="font-size: 11px; font-weight: 600; color: {T.inkMuted}; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">{eyebrow}</div>
    {/if}
    <h1 style="margin: 0; font-family: {T.fontDisplay}; font-weight: 400; font-size: 38px; line-height: 1.05; color: {T.ink}; letter-spacing: -0.02em;">{title}</h1>
    {#if subtitle}
      <div style="margin-top: 6px; font-size: 14px; color: {T.inkMuted}; line-height: 1.45; max-width: 560px;">{subtitle}</div>
    {/if}
  </div>

  <!-- Search -->
  <div style="
    display: flex; align-items: center; gap: 8px;
    height: 40px; padding: 0 14px; border-radius: 9999px;
    background: {T.surface}; border: 1px solid {T.hairline};
    width: 280px; margin-top: 8px;
  ">
    <Icon name="search" size={15} stroke={T.inkMuted} />
    <input placeholder="Search people, groups, offers…" style="
      border: 0; outline: none; background: transparent; flex: 1;
      font-family: {T.fontSans}; font-size: 13px; color: {T.ink};
    " />
    <kbd style="font-size: 10.5px; color: {T.inkMuted}; padding: 2px 5px; background: {T.pageDeep}; border-radius: 4px; font-family: {T.fontMono};">⌘K</kbd>
  </div>

  <div style="display: flex; gap: 6px; margin-top: 8px;">
    <button style="
      width: 40px; height: 40px; border-radius: 9999px;
      background: {T.surface}; border: 1px solid {T.hairline};
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: {T.shadow.xs};
    "><Icon name="bell" size={16} stroke={T.inkBody} /></button>
    <button style="
      width: 40px; height: 40px; border-radius: 9999px;
      background: {T.surface}; border: 1px solid {T.hairline};
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: {T.shadow.xs};
    "><Icon name="qr" size={16} stroke={T.inkBody} /></button>
  </div>

  {#if actions}
    <div style="display: flex; gap: 8px; margin-top: 8px;">{@render actions()}</div>
  {/if}
</div>
