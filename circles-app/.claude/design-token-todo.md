# Design Token Migration — Remaining Work

Goal: replace all DaisyUI classes in .svelte files with inline `style="{T.xxx}"` tokens from `$lib/design-system/tokens.js`.

Key conventions:
- Pill buttons: `height:36-48px;padding:0 18px;border-radius:9999px;border:0;background:T.primary;color:#fff;font-weight:580`
- Ghost buttons: `background:transparent;color:T.inkMuted;border:0`
- Inputs: `border:1px solid T.hairline;border-radius:10px;padding:10px 14px;font-family:T.fontSans;font-size:13px;`
- Eyebrow labels: `font-size:10px;font-weight:600;color:T.inkMuted;letter-spacing:0.06em;text-transform:uppercase`
- Surface cards: `background:T.surface;border:1px solid T.hairlineSoft;border-radius:14px;box-shadow:T.shadow.xs`
- `<details>` replaces DaisyUI `collapse` and `dropdown`
- Inline styled `<div>` replaces `<RowFrame>`

---

## ✅ DONE (committed)

### Commit ab138fb — Send/Trust/Migrate/Group flows
- wallet/flows/send/3_Amount.svelte
- wallet/flows/send/2_TokenFilters.svelte
- trust/flows/addTrust/1_PickAccounts.svelte
- trust/flows/addTrust/2_ConfirmTrust.svelte
- wallet/flows/migrateToV2/1_GetInvited.svelte → 4_Migrate.svelte
- groups/flows/createGroup/1_CreateGroup.svelte → 4_Create.svelte

### Commit b8ceaa4 — Market order/cart
- market/ui/MarketOrderListRow.svelte
- market/ui/OrderRow.svelte + SalesOrderRow.svelte
- market/orders/OrderDetailsPopup.svelte
- market/flows/checkout/CartPanel.svelte
- market/flows/checkout/OrderLineTable.svelte

### Commit 9c4e491 — Checkout flow
- market/flows/checkout/CheckoutForms.svelte
- market/flows/checkout/CheckoutReview.svelte
- market/flows/checkout/CheckoutPayment.svelte

### Commit 0c4e0bb — Settings sections
- settings/ui/sections/PersonalSection.svelte
- settings/ui/sections/KeysSection.svelte
- settings/ui/sections/NamespacesSection.svelte
- settings/ui/sections/MarketplaceSection.svelte
- settings/ui/sections/PaymentSection.svelte
- settings/ui/sections/MarketAuthListSection.svelte
- settings/ui/sections/BookmarksSection.svelte

### Commit 8c6cec9 — connect-safe hang fix
- routes/connect-wallet/connect-safe/+page.svelte

### Commit f2487a7 — RPC diagnostics/timeouts
- lib/areas/wallet/data/safeDiscovery.ts

### Commit e8c1cbd — High-impact UI
- routes/dashboard/TransactionDetailsPopup.svelte
- market/ui/product/ProductCard.svelte
- market/ui/ProductDetailsPopup.svelte
- wallet/ui/components/BalanceRow.svelte
- wallet/ui/pages/Balances.svelte
- wallet/ui/pages/SelectAsset.svelte
- wallet/ui/components/CurrencyInput.svelte

### Commit 88d2a9a — Shared components
- shared/ui/lists/ListToolbar.svelte
- shared/ui/primitives/tabs/Tabs.svelte
- shared/ui/profile/ProfileHeaderEditor.svelte
- shared/ui/avatar-search/AvatarSearchList.svelte
- shared/ui/profile/AddSigningKey.svelte

### Commit d53a952 — Register + market pages
- routes/register/register-organization/+page.svelte
- routes/market/[seller]/+page.svelte
- routes/market/[seller]/[sku]/+page.svelte

### Commit 48488bb — Profile popup
- profile/ui/pages/Profile.svelte

### Commit 9bb1c53 — ProfileEditor + ImageUpload
- profile/ui/components/ProfileEditor.svelte
- shared/ui/profile/components/ImageUpload.svelte

### Commit 28e0ba3 — Remaining lower-priority batch (19 files)
- groups/ui/components/CollateralTable.svelte
- groups/ui/components/GroupMembersManager.svelte
- market/flows/offer/1_Product.svelte
- market/flows/offer/2_Pricing.svelte
- settings/flows/gateway/ConfirmGatewayUntrust.svelte
- settings/flows/gateway/ManageTrust.svelte
- settings/ui/SettingsDropdown.svelte
- settings/ui/components/TrustRow.svelte
- settings/ui/editors/GroupSetting.svelte
- settings/ui/pages/SettingProfile.svelte
- wallet/ui/pages/MigrateTokens.svelte
- wallet/ui/pages/UnwrapTokens.svelte
- wallet/ui/pages/WrapTokens.svelte
- shared/ui/event-history/EventHistoryHeatmap.svelte
- shared/ui/flow/StepActionButtons.svelte
- shared/ui/primitives/HelpPopover.svelte
- shared/ui/shell/CloseConfirmStep.svelte
- shared/ui/shell/ConfirmActionStep.svelte
- shared/ui/shell/PromptTextStep.svelte

---

## 🔴 TODO — Infrastructure (do first, cascades to others)

- [ ] `shared/ui/primitives/ActionButton.svelte` — renders `class="btn inline-flex ... {theme[state]}"`. Many files pass btn class strings via the `theme` prop. Fix the component itself so callers don't need to.
- [ ] `shared/ui/primitives/RowFrame.svelte` — still used as a component in several files below
- [ ] `shared/ui/forms/FormField.svelte` — 2-line fix: `form-control` + `label-text`
- [ ] `shared/ui/shell/PageScaffold.svelte` — one hardcoded `btn btn-primary` button

---

## 🟠 TODO — User-facing (high priority)

### Onboarding / wallet
- [ ] `wallet/ui/onboarding/ConnectSafe.svelte` — `form-control`, `input-bordered`, btn classes
- [ ] `wallet/ui/onboarding/WalletLoader.svelte` — `loading-spinner` + `btn-ghost`
- [ ] `wallet/ui/onboarding/SelectWallet.svelte` — `loading-spinner` (mostly tokenized already)
- [ ] `wallet/ui/onboarding/WrongNetwork.svelte` — `loading-spinner` only
- [ ] `wallet/ui/components/ChangeButton.svelte` — check/fix
- [ ] `wallet/ui/components/CreateSafe.svelte` — check/fix

### Contacts flows
- [ ] `contacts/ui/pages/Invite.svelte` — `btn-primary`
- [ ] `contacts/ui/components/TrustActionCard.svelte` — btn
- [ ] `contacts/flows/addContact/2_YouAlreadyTrust.svelte` — btn variants

### Settings / gateway
- [ ] `settings/flows/gateway/ConfirmCreateGateway.svelte`
- [ ] `settings/flows/gateway/CreateGatewayProfile.svelte`
- [ ] `settings/ui/components/GatewayRow.svelte` — `<RowFrame>`
- [ ] `settings/ui/sections/BookmarkDetailsPopup.svelte` — `select-bordered`, btn

### Profile components
- [ ] `shared/ui/profile/ProfileSigningKeys.svelte` — `alert-error`, btn variants
- [ ] `shared/ui/profile/ProfileNamespaces.svelte` — form-control, input, checkbox, loading
- [ ] `shared/ui/profile/components/HoldersRow.svelte` — `<RowFrame>`
- [ ] `shared/ui/profile/components/TrustRelationRow.svelte` — `<RowFrame>`

### Market / offer
- [ ] `market/flows/offer/3_PreviewPublish.svelte`
- [ ] `market/flows/offer/PaymentGatewayDropdown.svelte` — `btn-outline`
- [ ] `market/orders/OrderDetailsView.svelte`

### Routes / pages
- [ ] `routes/jump/+page.svelte` — btn, alert
- [ ] `routes/dashboard/MintPopup.svelte` — `loading-spinner`
- [ ] `routes/groups/OwnedGroupRowView.svelte` — `<RowFrame>`
- [ ] `routes/register/+page.svelte` — `loading-spinner`
- [ ] `routes/back-circles/+page.svelte` — form, select, btn, alert (utility)
- [ ] `routes/util/+page.svelte` — form, btn, alert (utility)

### Shared utility components
- [ ] `shared/ui/content/jump/JumpPopup.svelte` — btn, `alert-error`
- [ ] `shared/ui/invitations/InvitationPickerStep.svelte` — `<RowFrame>`, radio
- [ ] `shared/ui/feedback/Error.svelte` — check/fix
- [ ] `shared/ui/flow/OnChainNameSection.svelte` — check/fix
- [ ] `shared/ui/avatar-search/AvatarSearchRow.svelte` — check/fix

### Event history sub-components
- [ ] `shared/ui/event-history/EventHistoryDayCalendar.svelte`
- [ ] `shared/ui/event-history/EventHistoryDayEventsPopup.svelte`
- [ ] `shared/ui/event-history/EventHistoryWeeklySections.svelte`

### List placeholders (skeleton loaders)
- [ ] `shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte`
- [ ] `shared/ui/lists/placeholders/BalanceRowPlaceholder.svelte`
- [ ] `shared/ui/lists/placeholders/EventHistoryRowPlaceholder.svelte`
- [ ] `shared/ui/lists/placeholders/GatewayRowPlaceholder.svelte`
- [ ] `shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte`
- [ ] `shared/ui/lists/VirtualList.svelte`

### Minting / trust history rows
- [ ] `minting/ui/history/PersonalMintDayEventRow.svelte`
- [ ] `trust/ui/history/TrustHistoryDayEventRow.svelte`

### Other minor
- [ ] `groups/ui/components/ModernHistoryChart.svelte`
- [ ] `routes/avatar-search/+page.svelte` — single btn link
- [ ] `profile/ui/ProfileExplorer.svelte` — check/fix

---

## 🟡 TODO — Admin area (staff-only, lower priority)

- [ ] `admin/components/AdminOdooProductEditor.svelte` — LARGE (72 patterns)
- [ ] `admin/flows/newProduct/5_Details.svelte` — LARGE (62 patterns)
- [ ] `admin/components/AdminUnlockProductEditor.svelte` — MEDIUM (43 patterns)
- [ ] `admin/components/OdooConnectionForm.svelte` — MEDIUM (24 patterns)
- [ ] `admin/components/AdminCodeProductEditor.svelte`
- [ ] `admin/components/AdminProductFormBase.svelte`
- [ ] `admin/components/AdminProductList.svelte`
- [ ] `admin/components/AdminProductRow.svelte`
- [ ] `admin/components/AdminSectionCard.svelte`
- [ ] `admin/flows/newProduct/2_Catalog.svelte`
- [ ] `admin/flows/newProduct/3_Type.svelte`
- [ ] `admin/flows/newProduct/6_Summary.svelte`
- [ ] `routes/admin/+page.svelte`

---

## Already-converted files with minor ActionButton stragglers
These just need the `class="btn..."` prop removed once ActionButton.svelte itself is fixed:
- `settings/ui/sections/PersonalSection.svelte` — 2× `<ActionButton class="btn btn-primary">`
