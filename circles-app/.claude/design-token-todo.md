# Design Token Migration — ✅ COMPLETE

All DaisyUI classes have been removed from `.svelte` files and replaced with
inline `style="{T.xxx}"` tokens from `$lib/design-system/tokens.ts`.

Key token conventions:
- Pill buttons: `height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;font-weight:580`
- Ghost buttons: `background:transparent;color:{T.inkMuted};border:0`
- Inputs: `border:1px solid {T.hairline};border-radius:10px;padding:10px 14px;font-family:{T.fontSans};font-size:13px`
- Eyebrow labels: `font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase`
- Surface cards: `background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;box-shadow:{T.shadow.xs}`

Final commits on `claude/implement-design-screens-Iy1X7`:
- `3c0aff7` — BalanceRow dropdown → Svelte state toggle
- `7aeb094` — Settings, onboarding, wallet flows, market popups
- `7243bf7` — Admin, market checkout, shared avatar, shell
- `8450748` — Shared UI, routes, kitchen-sink, app.css
- `64d9647` — Charts, MarkdownEditor, AvatarSkeletonSmall
- `75521a1` — Tooltip, PopupActionBar, ConformanceBalanceRow

Remaining non-DaisyUI Tailwind:
- `privacy-policy/+page.svelte` and `terms/+page.svelte` use `prose` (Tailwind Typography — intentional for long-form docs)
- Some `@apply` rules in `app.css` use pure Tailwind utilities (`.page`, `.page-stack`) — acceptable

---

## TODO — Next tasks

