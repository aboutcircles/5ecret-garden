import type { GalleryEntry } from './types';

import SendTo from '$lib/areas/wallet/flows/send/1_To.svelte';
import SendAsset from '$lib/areas/wallet/flows/send/2_Asset.svelte';
import SendAmount from '$lib/areas/wallet/flows/send/3_Amount.svelte';
import SendReview from '$lib/areas/wallet/flows/send/4_Send.svelte';
import { transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';

import MigrateInvite from '$lib/areas/wallet/flows/migrateToV2/1_GetInvited.svelte';
import MigrateProfile from '$lib/areas/wallet/flows/migrateToV2/2_CreateProfile.svelte';
import MigrateContacts from '$lib/areas/wallet/flows/migrateToV2/3_MigrateContacts.svelte';
import MigrateRun from '$lib/areas/wallet/flows/migrateToV2/4_Migrate.svelte';

import CreateGatewayProfile from '$lib/areas/settings/flows/gateway/CreateGatewayProfile.svelte';
import ConfirmCreateGateway from '$lib/areas/settings/flows/gateway/ConfirmCreateGateway.svelte';
import ManageTrust from '$lib/areas/settings/flows/gateway/ManageTrust.svelte';
import ConfirmGatewayUntrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayUntrust.svelte';

import AddContactSearch from '$lib/areas/contacts/flows/addContact/1_Search.svelte';
import AddContactAlreadyTrust from '$lib/areas/contacts/flows/addContact/2_YouAlreadyTrust.svelte';

import CreateGroupStart from '$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte';
import CreateGroupSettings from '$lib/areas/groups/flows/createGroup/2_Settings.svelte';
import CreateGroupReview from '$lib/areas/groups/flows/createGroup/3_Review.svelte';
import CreateGroupRun from '$lib/areas/groups/flows/createGroup/4_Create.svelte';


import CheckoutCart from '$lib/areas/market/flows/checkout/CartPanel.svelte';
import CheckoutForms from '$lib/areas/market/flows/checkout/CheckoutForms.svelte';
import CheckoutReview from '$lib/areas/market/flows/checkout/CheckoutReview.svelte';
import CheckoutPayment from '$lib/areas/market/flows/checkout/CheckoutPayment.svelte';

import OfferProduct from '$lib/areas/market/flows/offer/1_Product.svelte';
import OfferPricing from '$lib/areas/market/flows/offer/2_Pricing.svelte';
import OfferPreview from '$lib/areas/market/flows/offer/3_PreviewPublish.svelte';

import NewProductSeller from '$lib/areas/admin/flows/newProduct/1_Seller.svelte';
import NewProductCatalog from '$lib/areas/admin/flows/newProduct/2_Catalog.svelte';
import NewProductType from '$lib/areas/admin/flows/newProduct/3_Type.svelte';
import NewProductConnection from '$lib/areas/admin/flows/newProduct/4_CreateOdooConnection.svelte';
import NewProductDetails from '$lib/areas/admin/flows/newProduct/5_Details.svelte';
import NewProductSummary from '$lib/areas/admin/flows/newProduct/6_Summary.svelte';

import NewConnectionSeller from '$lib/areas/admin/flows/newConnection/1_Seller.svelte';
import NewConnectionDetails from '$lib/areas/admin/flows/newConnection/2_Details.svelte';

import SelectWallet from '$lib/areas/wallet/ui/onboarding/SelectWallet.svelte';
import WrongNetwork from '$lib/areas/wallet/ui/onboarding/WrongNetwork.svelte';
import ImportCircles from '$lib/areas/wallet/ui/onboarding/ImportCircles.svelte';
import Balances from '$lib/areas/wallet/ui/pages/Balances.svelte';
import WrapTokens from '$lib/areas/wallet/ui/pages/WrapTokens.svelte';
import UnwrapTokens from '$lib/areas/wallet/ui/pages/UnwrapTokens.svelte';
import MigrateTokens from '$lib/areas/wallet/ui/pages/MigrateTokens.svelte';
import RedeemGroup from '$lib/areas/groups/ui/pages/RedeemGroup.svelte';

import ProfilePopup from '$lib/areas/profile/ui/pages/ProfilePopup.svelte';
import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
import Invite from '$lib/areas/contacts/ui/pages/Invite.svelte';

import SettingProfile from '$lib/areas/settings/ui/pages/SettingProfile.svelte';
import ProfileExplorer from '$lib/areas/profile/ui/ProfileExplorer.svelte';
import AddSigningKey from '$lib/shared/ui/profile/AddSigningKey.svelte';
import BookmarkDetailsPopup from '$lib/areas/settings/ui/sections/BookmarkDetailsPopup.svelte';

import ProductDetailsPopup from '$lib/areas/market/ui/ProductDetailsPopup.svelte';
import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';
import SalesOrderDetailsPopup from '$lib/areas/market/ui/SalesOrderDetailsPopup.svelte';

import JumpPopup from '$lib/shared/ui/content/jump/JumpPopup.svelte';
import CloseConfirmStep from '$lib/shared/ui/shell/CloseConfirmStep.svelte';
import ErrorPopup from '$lib/shared/ui/feedback/Error.svelte';
import EventHistoryDayEventsPopup from '$lib/shared/ui/event-history/EventHistoryDayEventsPopup.svelte';

import GroupSettingsPrototype from '../../group-management/GroupSettingsPrototype.svelte';
import AddGroupMemberPrototype from '../../group-management/AddGroupMemberPrototype.svelte';
import ConfirmGroupTrustPrototype from '../../group-management/ConfirmGroupTrustPrototype.svelte';
import PopupDemoCard from '../state-feedback/PopupDemoCard.svelte';

import EventHistoryDemoRow from './EventHistoryDemoRow.svelte';

const mockAddressA = '0x1111111111111111111111111111111111111111';
const mockAddressB = '0x2222222222222222222222222222222222222222';
const mockAddressC = '0x3333333333333333333333333333333333333333';
const mockAddressD = '0x4444444444444444444444444444444444444444';

function mockSendContext() {
  return {
    selectedAddress: mockAddressB,
    transitiveOnly: true,
    selectedAsset: transitiveTransfer(),
    amount: 12,
    dataType: 'utf-8' as const,
    data: 'Demo payment reference',
    maxTransfers: 6,
  };
}

function mockMigrateContext() {
  return {
    inviter: mockAddressA,
    profile: {
      name: 'Demo Migrated Profile',
      description: 'Preview profile for migration flow',
    },
    trustList: [mockAddressB, mockAddressC],
  };
}

function mockGatewayContext() {
  return {
    factoryAddress: '0x186725D8fe10a573DC73144F7a317fCae5314F19',
    gatewayName: 'demo-shop',
    metadataDigest: '0x' + '00'.repeat(32),
    profile: {
      name: 'Demo Shop Gateway',
      description: 'Gateway used in popup gallery previews.',
      imageUrl: '',
      previewImageUrl: '',
    },
  };
}

function mockAddContactContext() {
  return {
    selectedAddress: mockAddressC,
    trustVersion: 2,
  };
}

function mockCreateGroupContext() {
  return {
    profile: {
      name: 'Demo Group',
      onChainName: 'demo-group',
      symbol: 'DGR',
      description: 'A group shown in the popup gallery',
      previewImageUrl: '',
      imageUrl: '',
    },
    service: '0x0000000000000000000000000000000000000000',
    feeCollection: mockAddressA,
    initialConditions: [mockAddressA],
    settingsMode: 'fast' as const,
  };
}

function mockNewProductContext() {
  return {
    chainId: 100,
    seller: mockAddressA,
    selectedType: 'codedispenser' as const,
    enabled: true,
    poolId: 'POOL-001',
    downloadUrlTemplate: 'https://example.org/download/{code}',
    codesTextarea: 'CODE-1\nCODE-2',
    odooProductCode: 'DEMO-OD-1',
    selectedConnectionKey: '',
    catalogItem: {
      seller: mockAddressA,
      productCid: 'bafy-demo',
      linkKeccak: '0x1234',
      indexInChunk: 1,
      publishedAt: Date.now(),
      product: {
        sku: 'demo-sku',
        name: 'Demo Product',
      },
    },
  };
}

function mockNewConnectionContext() {
  return {
    chainId: 100,
    seller: mockAddressA,
    odooUrl: 'https://odoo.example.org',
    odooDb: 'demo_db',
    odooUid: 10,
    odooKey: 'secret',
    salePartnerId: null,
    jsonrpcTimeoutMs: 30000,
    fulfillInheritRequestAbort: false,
    enabled: true,
  };
}

function noop() {}
async function noopAsync() {}

export const popupGalleryEntries: GalleryEntry[] = [
  {
    id: 'flow-send',
    kind: 'flow',
    label: 'Wallet send flow',
    domain: 'Wallet',
    purpose: 'Recipient → route → amount → review for token transfer popups.',
    steps: [
      { id: 'send-1', title: '1_To.svelte', purpose: 'Pick recipient', component: SendTo, propsFactory: () => ({ context: mockSendContext() }) },
      { id: 'send-2', title: '2_Asset.svelte', purpose: 'Pick route/asset', component: SendAsset, propsFactory: () => ({ context: mockSendContext() }) },
      { id: 'send-3', title: '3_Amount.svelte', purpose: 'Input amount', component: SendAmount, propsFactory: () => ({ context: mockSendContext() }) },
      { id: 'send-4', title: '4_Send.svelte', purpose: 'Review and submit', component: SendReview, propsFactory: () => ({ context: mockSendContext() }) },
    ],
  },
  {
    id: 'flow-migrate-v2',
    kind: 'flow',
    label: 'Wallet migrate-to-v2 flow',
    domain: 'Wallet',
    purpose: 'Invitation/profile/contacts migration wizard.',
    steps: [
      { id: 'm2v-1', title: '1_GetInvited.svelte', purpose: 'Select inviter', component: MigrateInvite, propsFactory: () => ({ context: mockMigrateContext() }) },
      { id: 'm2v-2', title: '2_CreateProfile.svelte', purpose: 'Prepare profile', component: MigrateProfile, propsFactory: () => ({ context: mockMigrateContext() }) },
      { id: 'm2v-3', title: '3_MigrateContacts.svelte', purpose: 'Choose contacts', component: MigrateContacts, propsFactory: () => ({ context: mockMigrateContext() }) },
      { id: 'm2v-4', title: '4_Migrate.svelte', purpose: 'Confirm migration', component: MigrateRun, propsFactory: () => ({ context: mockMigrateContext() }) },
    ],
  },
  {
    id: 'flow-gateway-create',
    kind: 'flow',
    label: 'Gateway create flow',
    domain: 'Settings',
    purpose: 'Create payment gateway from profile and confirmation steps.',
    steps: [
      { id: 'gw-create-1', title: 'CreateGatewayProfile.svelte', purpose: 'Set gateway profile', component: CreateGatewayProfile, propsFactory: () => ({ context: mockGatewayContext(), onCreated: noop }) },
      { id: 'gw-create-2', title: 'ConfirmCreateGateway.svelte', purpose: 'Review and create', component: ConfirmCreateGateway, propsFactory: () => ({ context: mockGatewayContext(), onCreated: noop }) },
    ],
  },
  {
    id: 'flow-gateway-manage-trust',
    kind: 'flow',
    label: 'Gateway manage trust flow',
    domain: 'Settings',
    purpose: 'Manage trust receivers for a gateway.',
    steps: [
      { id: 'gw-trust-1', title: 'ManageTrust.svelte', purpose: 'List trusted accounts', component: ManageTrust, propsFactory: () => ({ gateway: mockAddressA }) },
      { id: 'gw-trust-4', title: 'ConfirmGatewayUntrust.svelte', purpose: 'Confirm untrust', component: ConfirmGatewayUntrust, propsFactory: () => ({ gateway: mockAddressA, trustReceiver: mockAddressC, onDone: noop }) },
    ],
  },
  {
    id: 'flow-add-contact',
    kind: 'flow',
    label: 'Contacts add-contact flow',
    domain: 'Contacts',
    purpose: 'Search and trust-management branching flow.',
    steps: [
      { id: 'contact-1', title: '1_Search.svelte', purpose: 'Search contacts', component: AddContactSearch, propsFactory: () => ({ context: mockAddContactContext() }) },
      { id: 'contact-2', title: '2_YouAlreadyTrust.svelte', purpose: 'Already-trusted branch', component: AddContactAlreadyTrust, propsFactory: () => ({ context: mockAddContactContext() }) },
    ],
  },
  {
    id: 'flow-create-group',
    kind: 'flow',
    label: 'Groups create-group flow',
    domain: 'Groups',
    purpose: 'Create group from details through creation confirmation.',
    steps: [
      { id: 'group-create-1', title: '1_CreateGroup.svelte', purpose: 'Group basics', component: CreateGroupStart, propsFactory: () => ({ context: mockCreateGroupContext(), setGroup: noop }) },
      { id: 'group-create-2', title: '2_Settings.svelte', purpose: 'Group settings', component: CreateGroupSettings, propsFactory: () => ({ context: mockCreateGroupContext(), setGroup: noop }) },
      { id: 'group-create-3', title: '3_Review.svelte', purpose: 'Review settings', component: CreateGroupReview, propsFactory: () => ({ context: mockCreateGroupContext(), setGroup: noop }) },
      { id: 'group-create-4', title: '4_Create.svelte', purpose: 'Create on-chain', component: CreateGroupRun, propsFactory: () => ({ context: mockCreateGroupContext(), setGroup: noop }) },
    ],
  },
  {
    id: 'flow-checkout',
    kind: 'flow',
    label: 'Market checkout flow',
    domain: 'Market',
    purpose: 'Cart -> details -> review -> payment.',
    steps: [
      { id: 'checkout-1', title: 'CartPanel.svelte', purpose: 'Review cart', component: CheckoutCart },
      { id: 'checkout-2', title: 'CheckoutForms.svelte', purpose: 'Fill required details', component: CheckoutForms },
      { id: 'checkout-3', title: 'CheckoutReview.svelte', purpose: 'Order review', component: CheckoutReview },
      { id: 'checkout-4', title: 'CheckoutPayment.svelte', purpose: 'Pay via QR/transfer', component: CheckoutPayment },
    ],
  },
  {
    id: 'flow-offer',
    kind: 'flow',
    label: 'Market offer flow',
    domain: 'Market',
    purpose: 'Create offer through product/pricing/review.',
    steps: [
      { id: 'offer-1', title: '1_Product.svelte', purpose: 'Product details', component: OfferProduct, propsFactory: () => ({ context: { operator: mockAddressA, draft: { sku: 'demo-sku', name: 'Demo Product', description: 'Demo desc' } } }) },
      { id: 'offer-2', title: '2_Pricing.svelte', purpose: 'Pricing + gateway', component: OfferPricing, propsFactory: () => ({ context: { operator: mockAddressA, draft: { sku: 'demo-sku', name: 'Demo Product', price: 10, priceCurrency: 'CRC', paymentGateway: mockAddressB } } }) },
      { id: 'offer-3', title: '3_PreviewPublish.svelte', purpose: 'Review + publish', component: OfferPreview, propsFactory: () => ({ context: { operator: mockAddressA, draft: { sku: 'demo-sku', name: 'Demo Product', price: 10, priceCurrency: 'CRC', paymentGateway: mockAddressB } } }) },
    ],
  },
  {
    id: 'flow-admin-new-product',
    kind: 'flow',
    label: 'Admin new-product flow',
    domain: 'Admin',
    purpose: 'Admin flow to configure product integration.',
    steps: [
      { id: 'admin-product-1', title: '1_Seller.svelte', purpose: 'Select seller', component: NewProductSeller, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
      { id: 'admin-product-2', title: '2_Catalog.svelte', purpose: 'Select catalog item', component: NewProductCatalog, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
      { id: 'admin-product-3', title: '3_Type.svelte', purpose: 'Select fulfillment type', component: NewProductType, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
      { id: 'admin-product-4', title: '4_CreateOdooConnection.svelte', purpose: 'Optional new connection', component: NewProductConnection, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
      { id: 'admin-product-5', title: '5_Details.svelte', purpose: 'Enter product details', component: NewProductDetails, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
      { id: 'admin-product-6', title: '6_Summary.svelte', purpose: 'Review + execute', component: NewProductSummary, propsFactory: () => ({ context: mockNewProductContext(), connections: [], existingProducts: [], onExecute: noopAsync, onCreateConnection: (async () => ({})) }) },
    ],
  },
  {
    id: 'flow-admin-new-connection',
    kind: 'flow',
    label: 'Admin new-connection flow',
    domain: 'Admin',
    purpose: 'Create Odoo connection in two steps.',
    steps: [
      { id: 'admin-conn-1', title: '1_Seller.svelte', purpose: 'Select seller', component: NewConnectionSeller, propsFactory: () => ({ context: mockNewConnectionContext(), onCreate: noopAsync }) },
      { id: 'admin-conn-2', title: '2_Details.svelte', purpose: 'Enter connection details', component: NewConnectionDetails, propsFactory: () => ({ context: mockNewConnectionContext(), onCreate: noopAsync }) },
    ],
  },
  {
    id: 'standalone-wallet-onboarding-select',
    kind: 'standalone',
    label: 'SelectWallet.svelte',
    domain: 'Wallet',
    purpose: 'Wallet connector selection popup.',
    step: { id: 'single-select-wallet', title: 'Select wallet', purpose: 'Onboarding entry', component: SelectWallet },
  },
  {
    id: 'standalone-wallet-onboarding-wrong-network',
    kind: 'standalone',
    label: 'WrongNetwork.svelte',
    domain: 'Wallet',
    purpose: 'Wrong chain warning and chain switch action.',
    step: { id: 'single-wrong-network', title: 'Wrong network', purpose: 'Network mismatch recovery', component: WrongNetwork, inlineDefault: true },
  },
  {
    id: 'standalone-wallet-onboarding-import',
    kind: 'standalone',
    label: 'ImportCircles.svelte',
    domain: 'Wallet',
    purpose: 'Seed phrase import popup.',
    step: { id: 'single-import-circles', title: 'Import circles', purpose: 'Import by seed phrase', component: ImportCircles },
  },
  {
    id: 'standalone-wallet-balances',
    kind: 'standalone',
    label: 'Balances.svelte',
    domain: 'Wallet',
    purpose: 'Balances list popup with filtering/search.',
    step: { id: 'single-balances', title: 'Balances', purpose: 'Browse token balances', component: Balances },
  },
  {
    id: 'standalone-wallet-wrap',
    kind: 'standalone',
    label: 'WrapTokens.svelte',
    domain: 'Wallet',
    purpose: 'Wrap token popup action.',
    step: { id: 'single-wrap', title: 'Wrap tokens', purpose: 'Wrap tokens action', component: WrapTokens, propsFactory: () => ({ asset: transitiveTransfer() }) },
  },
  {
    id: 'standalone-wallet-unwrap',
    kind: 'standalone',
    label: 'UnwrapTokens.svelte',
    domain: 'Wallet',
    purpose: 'Unwrap token popup action.',
    step: { id: 'single-unwrap', title: 'Unwrap tokens', purpose: 'Unwrap tokens action', component: UnwrapTokens, propsFactory: () => ({ asset: transitiveTransfer() }) },
  },
  {
    id: 'standalone-wallet-migrate-token',
    kind: 'standalone',
    label: 'MigrateTokens.svelte',
    domain: 'Wallet',
    purpose: 'Migrate v1 token popup action.',
    step: { id: 'single-migrate-token', title: 'Migrate token', purpose: 'Token migration action', component: MigrateTokens, propsFactory: () => ({ asset: transitiveTransfer() }) },
  },
  {
    id: 'standalone-groups-redeem',
    kind: 'standalone',
    label: 'RedeemGroup.svelte',
    domain: 'Groups',
    purpose: 'Group redeem popup.',
    step: { id: 'single-redeem-group', title: 'Redeem group', purpose: 'Redeem group token collateral', component: RedeemGroup, propsFactory: () => ({ asset: transitiveTransfer() }) },
  },
  {
    id: 'standalone-profile-popup',
    kind: 'standalone',
    label: 'ProfilePopup.svelte',
    domain: 'Profile',
    purpose: 'Canonical profile popup wrapper.',
    step: { id: 'single-profile-popup', title: 'Profile popup', purpose: 'Show profile details', component: ProfilePopup, propsFactory: () => ({ address: mockAddressA, trustVersion: 2 }) },
  },
  {
    id: 'standalone-contacts-untrust',
    kind: 'standalone',
    label: 'Untrust.svelte',
    domain: 'Contacts',
    purpose: 'Untrust confirmation popup.',
    step: { id: 'single-untrust', title: 'Untrust', purpose: 'Untrust action', component: Untrust, propsFactory: () => ({ address: mockAddressB, trustVersion: 2 }) },
  },
  {
    id: 'standalone-contacts-invite',
    kind: 'standalone',
    label: 'Invite.svelte',
    domain: 'Contacts',
    purpose: 'Invite popup branch.',
    step: { id: 'single-invite', title: 'Invite', purpose: 'Invite action', component: Invite, propsFactory: () => ({ address: mockAddressC }) },
  },
  {
    id: 'standalone-settings-profile',
    kind: 'standalone',
    label: 'SettingProfile.svelte',
    domain: 'Settings',
    purpose: 'Settings profile quick actions popup.',
    step: { id: 'single-setting-profile', title: 'Setting profile', purpose: 'Profile/settings surface', component: SettingProfile, propsFactory: () => ({ address: mockAddressA }) },
  },
  {
    id: 'standalone-profile-explorer',
    kind: 'standalone',
    label: 'ProfileExplorer.svelte',
    domain: 'Profile',
    purpose: 'Profile editor popup surface.',
    step: { id: 'single-profile-explorer', title: 'Profile explorer', purpose: 'Edit profile details', component: ProfileExplorer, propsFactory: () => ({ avatar: mockAddressA, pinApiBase: 'https://example.org/api' }) },
  },
  {
    id: 'standalone-profile-add-signing-key',
    kind: 'standalone',
    label: 'AddSigningKey.svelte',
    domain: 'Profile',
    purpose: 'Add signing key popup.',
    step: { id: 'single-add-signing-key', title: 'Add signing key', purpose: 'Profile signing key management', component: AddSigningKey, propsFactory: () => ({ avatar: mockAddressA, pinApiBase: 'https://example.org/api' }) },
  },
  {
    id: 'standalone-settings-bookmark-details',
    kind: 'standalone',
    label: 'BookmarkDetailsPopup.svelte',
    domain: 'Settings',
    purpose: 'Bookmark details and folder management popup.',
    step: { id: 'single-bookmark-details', title: 'Bookmark details', purpose: 'Bookmark detail management', component: BookmarkDetailsPopup, propsFactory: () => ({ bookmark: { address: mockAddressA, createdAt: Date.now(), note: 'Demo note', folder: 'VIPs' } }) },
  },
  {
    id: 'standalone-market-product-details',
    kind: 'standalone',
    label: 'ProductDetailsPopup.svelte',
    domain: 'Market',
    purpose: 'Product details popup.',
    step: { id: 'single-product-details', title: 'Product details', purpose: 'Product preview and add-to-cart', component: ProductDetailsPopup, propsFactory: () => ({ seller: mockAddressA, sku: 'demo-sku' }) },
  },
  {
    id: 'standalone-market-order-details',
    kind: 'standalone',
    label: 'OrderDetailsPopup.svelte',
    domain: 'Market',
    purpose: 'Buyer order details popup.',
    step: { id: 'single-order-details', title: 'Order details', purpose: 'Buyer order detail view', component: OrderDetailsPopup, propsFactory: () => ({ snapshot: { orderNumber: 'DEMO-ORDER-1', orderStatus: 'https://schema.org/OrderProcessing', orderedItem: [{ sku: 'demo-sku', name: 'Demo product' }] } }) },
  },
  {
    id: 'standalone-market-sales-order-details',
    kind: 'standalone',
    label: 'SalesOrderDetailsPopup.svelte',
    domain: 'Market',
    purpose: 'Seller order details popup.',
    step: { id: 'single-sales-order-details', title: 'Sales order details', purpose: 'Seller order detail view', component: SalesOrderDetailsPopup, propsFactory: () => ({ orderId: 'DEMO-SALES-ORDER' }) },
  },
  {
    id: 'standalone-close-confirm-step',
    kind: 'standalone',
    label: 'CloseConfirmStep.svelte',
    domain: 'Shared',
    purpose: 'Stack-pushed close confirmation step for explicit-dismiss popups.',
    step: {
      id: 'single-close-confirm-step',
      title: 'Close confirm step',
      purpose: 'Confirm close of form/flow popup',
      component: CloseConfirmStep,
      propsFactory: () => ({
        message: 'Do you really want to close the form?',
        onYes: noop,
        onNo: noop,
      }),
      inlineDefault: true,
    },
  },
  {
    id: 'standalone-jump-popup',
    kind: 'standalone',
    label: 'JumpPopup.svelte',
    domain: 'Shared',
    purpose: 'External link confirmation popup.',
    step: { id: 'single-jump-popup', title: 'Jump popup', purpose: 'Open external link confirmation', component: JumpPopup, propsFactory: () => ({ to: 'https://aboutcircles.com' }), inlineDefault: true },
  },
  {
    id: 'standalone-error-popup',
    kind: 'standalone',
    label: 'Error.svelte',
    domain: 'Shared',
    purpose: 'Global error popup surface.',
    step: { id: 'single-error-popup', title: 'Error popup', purpose: 'Show async/runtime errors', component: ErrorPopup, propsFactory: () => ({ errorMessage: 'Demo error for popup gallery', stackTrace: 'Error: Demo\n at PopupGallery (gallery)' }), inlineDefault: true },
  },
  {
    id: 'standalone-event-history-day-popup',
    kind: 'standalone',
    label: 'EventHistoryDayEventsPopup.svelte',
    domain: 'Shared',
    purpose: 'Day event breakdown popup.',
    step: {
      id: 'single-event-history-day',
      title: 'Day events popup',
      purpose: 'Inspect event list for one day',
      component: EventHistoryDayEventsPopup,
      propsFactory: () => ({
        dayStartSec: 1_736_000_000,
        dayEndSec: 1_736_086_399,
        events: [
          { $event: 'Transfer', transactionHash: '0xabc1', blockNumber: 1, transactionIndex: 1, logIndex: 1, timestamp: 1_736_000_111 },
          { $event: 'Trust', transactionHash: '0xabc2', blockNumber: 2, transactionIndex: 1, logIndex: 1, timestamp: 1_736_000_222 },
        ],
        rowComponent: EventHistoryDemoRow,
      }),
    },
  },
  {
    id: 'standalone-group-settings-prototype',
    kind: 'standalone',
    label: 'GroupSettingsPrototype.svelte',
    domain: 'Prototype',
    purpose: 'Prototype group settings popup.',
    step: { id: 'single-group-settings-prototype', title: 'Group settings prototype', purpose: 'Prototype settings surface', component: GroupSettingsPrototype, propsFactory: () => ({ group: mockAddressD }) },
  },
  {
    id: 'standalone-add-group-member-prototype',
    kind: 'standalone',
    label: 'AddGroupMemberPrototype.svelte',
    domain: 'Prototype',
    purpose: 'Prototype add members popup.',
    step: { id: 'single-add-group-member-prototype', title: 'Add group member prototype', purpose: 'Prototype add members surface', component: AddGroupMemberPrototype, propsFactory: () => ({ group: mockAddressD, onSelected: noopAsync }) },
  },
  {
    id: 'standalone-confirm-group-trust-prototype',
    kind: 'standalone',
    label: 'ConfirmGroupTrustPrototype.svelte',
    domain: 'Prototype',
    purpose: 'Prototype group trust confirm popup.',
    step: { id: 'single-confirm-group-trust-prototype', title: 'Confirm group trust prototype', purpose: 'Prototype trust confirmation', component: ConfirmGroupTrustPrototype, propsFactory: () => ({ group: mockAddressD, address: mockAddressC, onTrusted: noopAsync }) },
  },
  {
    id: 'standalone-popup-demo-card',
    kind: 'standalone',
    label: 'PopupDemoCard.svelte',
    domain: 'Kitchen Sink',
    purpose: 'Popup stack behavior demo card.',
    step: { id: 'single-popup-demo-card', title: 'Popup stack demo', purpose: 'State feedback popup demo', component: PopupDemoCard, propsFactory: () => ({ step: 1 }), inlineDefault: true },
  },
];

const entrypointsById: Record<string, string[]> = {
  'flow-send': [
    'src/lib/areas/wallet/flows/send/openSendFlowPopup.ts#openSendFlowPopup',
    'src/lib/areas/profile/ui/pages/Profile.svelte#sendAction',
  ],
  'flow-migrate-v2': [
    'src/routes/+layout.svelte#openMigratePopup',
    'src/routes/settings/+layout.svelte#openMigratePopup',
  ],
  'flow-gateway-create': ['src/lib/areas/settings/ui/sections/PaymentSection.svelte#openCreateGatewayPopup'],
  'flow-gateway-manage-trust': ['src/lib/areas/settings/ui/components/GatewayRow.svelte#openManageTrust'],
  'flow-add-contact': ['src/routes/contacts/+page.svelte#openAddContact'],
  'flow-create-group': ['src/routes/groups/+page.svelte#openCreateGroup'],
  'flow-checkout': ['src/routes/DefaultHeader.svelte#openCartPanel'],
  'flow-offer': [
    'src/routes/settings/+layout.svelte#openOfferStep1',
    'src/routes/market/[seller]/+page.svelte#openOfferStep1',
  ],
  'flow-admin-new-product': ['src/routes/admin/+page.svelte#openNewProductFlow'],
  'flow-admin-new-connection': ['src/routes/admin/+page.svelte#openNewConnectionFlow'],
  'standalone-wallet-onboarding-select': ['src/routes/+page.svelte#openSelectWallet'],
  'standalone-wallet-onboarding-wrong-network': ['src/routes/+layout.svelte#openWrongNetworkPopup'],
  'standalone-wallet-onboarding-import': ['src/lib/areas/wallet/ui/onboarding/SelectWallet.svelte#openImportCircles'],
  'standalone-wallet-balances': ['src/routes/dashboard/+page.svelte#openBalances'],
  'standalone-wallet-wrap': ['src/lib/areas/wallet/ui/components/BalanceRow.svelte#actions'],
  'standalone-wallet-unwrap': ['src/lib/areas/wallet/ui/components/BalanceRow.svelte#actions'],
  'standalone-wallet-migrate-token': ['src/lib/areas/wallet/ui/components/BalanceRow.svelte#actions'],
  'standalone-groups-redeem': ['src/lib/areas/wallet/ui/components/BalanceRow.svelte#actions'],
  'standalone-profile-popup': ['src/lib/shared/ui/avatar/Avatar.svelte#openProfilePopup'],
  'standalone-contacts-untrust': ['src/lib/areas/contacts/flows/addContact/2_YouAlreadyTrust.svelte#openUntrust'],
  'standalone-contacts-invite': ['src/lib/areas/contacts/flows/addContact/1_Search.svelte#openInvite'],
  'standalone-settings-profile': ['src/lib/shared/ui/shell/PageScaffold.svelte#openSettingProfile'],
  'standalone-profile-explorer': ['src/lib/areas/settings/ui/pages/SettingProfile.svelte#openProfileEditor'],
  'standalone-profile-add-signing-key': ['src/lib/areas/settings/ui/sections/KeysSection.svelte#openAddSigningKey'],
  'standalone-settings-bookmark-details': ['src/lib/areas/settings/ui/sections/BookmarksSection.svelte#openBookmarkDetails'],
  'standalone-market-product-details': [
    'src/lib/areas/market/ui/product/ProductCard.svelte#openProductDetails',
    'src/lib/areas/market/orders/OrderDetailsView.svelte#openProductDetails',
  ],
  'standalone-market-order-details': ['src/lib/areas/market/ui/OrderRow.svelte#openOrderDetails'],
  'standalone-market-sales-order-details': ['src/lib/areas/market/ui/SalesOrderRow.svelte#openSalesOrderDetails'],
  'standalone-close-confirm-step': ['src/lib/shared/ui/shell/PopupHost.svelte#pushCloseConfirmStep'],
  'standalone-jump-popup': ['src/lib/shared/ui/content/jump/JumpLink.svelte#onClick'],
  'standalone-error-popup': ['src/lib/shared/utils/tasks.ts#runTaskErrorPopup'],
  'standalone-event-history-day-popup': ['src/lib/shared/ui/event-history/EventHistoryHeatmap.svelte#openDayPopup'],
  'standalone-group-settings-prototype': ['src/routes/group-management/+page.svelte#openGroupSettingsPrototype'],
  'standalone-add-group-member-prototype': ['src/routes/group-management/GroupMembersPrototype.svelte#openAddGroupMemberPrototype'],
  'standalone-confirm-group-trust-prototype': ['src/routes/group-management/GroupMembersPrototype.svelte#openConfirmGroupTrustPrototype'],
  'standalone-popup-demo-card': ['src/routes/kitchen-sink/state-feedback/+page.svelte#openPopupDemoCard'],
};

for (const entry of popupGalleryEntries) {
  entry.entrypoints = entrypointsById[entry.id] ?? ['(entrypoint mapping pending)'];
}
