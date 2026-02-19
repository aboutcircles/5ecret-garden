import { browser } from '$app/environment';
import type { Address } from '@aboutcircles/sdk-types';
import {
  getAdminBaseUrl,
  getAdminAuthHeader,
} from './adminAuth';

// ============= Types =============

export interface MarketRoute {
  chainId: number;
  seller: string;
  sku: string;
  offerType: 'odoo' | 'codedispenser' | null;
  isOneOff?: boolean;
  enabled: boolean;
}

export interface RouteUpsertInput {
  chainId: number;
  seller: string;
  sku: string;
  offerType: 'odoo' | 'codedispenser' | null;
  isOneOff: boolean;
  enabled: boolean;
}

export interface AdminHealth {
  ok: boolean;
}

export interface OdooConnectionConfig {
  chainId: number;
  seller: Address;
  odooUrl: string;
  odooDb: string;
  odooUid: number;
  odooKey: string;
  salePartnerId?: number;
  jsonrpcTimeoutMs?: number;
  fulfillInheritRequestAbort?: boolean;
  enabled: boolean;
}

export interface OdooConnectionListItem {
  chainId: number;
  seller: Address;
  odooUrl: string;
  odooDb: string;
  odooUid: number;
  salePartnerId: number | null;
  jsonrpcTimeoutMs: number | null;
  fulfillInheritRequestAbort: boolean | null;
  enabled: boolean;
  revokedAt: string | null;
}

export interface OdooProductConfig {
  chainId: number;
  seller: Address;
  sku: string;
  odooProductCode: string;
  enabled: boolean;
}

export interface OdooProductListItem {
  chainId: number;
  seller: Address;
  sku: string;
  odooProductCode: string;
  enabled: boolean;
  revokedAt: string | null;
}

export interface OdooProductCatalogItem {
  id: number;
  display_name: string;
  default_code: string | null;
  product_tmpl_id: [number, string];
  barcode: string | null;
  qty_available: number;
  active: boolean;
}

export interface OdooProductCatalogResponse {
  items: OdooProductCatalogItem[];
  limit: number;
  offset: number;
  activeOnly: boolean;
  hasCode: boolean;
}

export interface CodeProductConfig {
  chainId: number;
  seller: Address;
  sku: string;
  poolId: string;
  downloadUrlTemplate?: string;
  codes?: string[];
  enabled: boolean;
}

export interface CodeProductListItem {
  chainId: number;
  seller: Address;
  sku: string;
  poolId: string;
  downloadUrlTemplate: string | null;
  enabled: boolean;
  revokedAt: string | null;
  poolRemaining: number | null;
}

// ============= API Functions =============

/**
 * Get the admin API base URL - re-exported for convenience
 */
function getBaseUrl(): string {
  if (!browser) {
    throw new Error('Admin client can only be used in the browser');
  }
  return getAdminBaseUrl();
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeader(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ============= Route Management =============

/**
 * List all configured routes
 */
export async function adminHealth(): Promise<AdminHealth> {
  return adminFetch<AdminHealth>('/admin/health');
}

export async function listRoutes(): Promise<MarketRoute[]> {
  return adminFetch<MarketRoute[]>('/admin/routes');
}

export async function upsertRoute(route: RouteUpsertInput): Promise<MarketRoute> {
  return adminFetch<MarketRoute>('/admin/routes', {
    method: 'PUT',
    body: JSON.stringify(route),
  });
}

export async function disableRoute(chainId: number, seller: string, sku: string): Promise<{ ok: true }> {
  const path = `/admin/routes/${chainId}/${encodeURIComponent(seller)}/${encodeURIComponent(sku)}`;
  return adminFetch<{ ok: true }>(path, { method: 'DELETE' });
}

// ============= Odoo Connection Configuration =============

/**
 * Create or update an Odoo connection configuration
 */
export async function upsertOdooConnection(config: OdooConnectionConfig): Promise<OdooConnectionListItem> {
  return adminFetch<OdooConnectionListItem>('/admin/odoo-connections', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function listOdooConnections(): Promise<OdooConnectionListItem[]> {
  return adminFetch<OdooConnectionListItem[]>('/admin/odoo-connections');
}

export async function disableOdooConnection(chainId: number, seller: string): Promise<{ ok: true }> {
  const path = `/admin/odoo-connections/${chainId}/${encodeURIComponent(seller)}`;
  return adminFetch<{ ok: true }>(path, { method: 'DELETE' });
}

// ============= Odoo Product Configuration =============

/**
 * Create or update an Odoo-backed product configuration
 */
export async function upsertOdooProduct(config: OdooProductConfig): Promise<void> {
  await adminFetch<void>('/admin/odoo-products', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function listOdooProducts(): Promise<OdooProductListItem[]> {
  return adminFetch<OdooProductListItem[]>('/admin/odoo-products');
}

export async function disableOdooProduct(chainId: number, seller: string, sku: string): Promise<{ ok: true }> {
  const path = `/admin/odoo-products/${chainId}/${encodeURIComponent(seller)}/${encodeURIComponent(sku)}`;
  return adminFetch<{ ok: true }>(path, { method: 'DELETE' });
}

export async function listOdooProductCatalog(params: {
  chainId: number;
  seller: string;
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
  hasCode?: boolean;
}): Promise<OdooProductCatalogResponse> {
  const url = new URL(`${getBaseUrl()}/admin/odoo-product-catalog`);
  url.searchParams.set('chainId', String(params.chainId));
  url.searchParams.set('seller', params.seller);
  if (params.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params.offset != null) url.searchParams.set('offset', String(params.offset));
  if (params.activeOnly != null) url.searchParams.set('activeOnly', String(params.activeOnly));
  if (params.hasCode != null) url.searchParams.set('hasCode', String(params.hasCode));

  const res = await fetch(url.toString(), {
    headers: {
      ...getAdminAuthHeader(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET /admin/odoo-product-catalog failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<OdooProductCatalogResponse>;
}

// ============= CodeDispenser Product Configuration =============

/**
 * Create or update a CodeDispenser-backed product configuration
 */
export async function upsertCodeProduct(config: CodeProductConfig): Promise<void> {
  await adminFetch<void>('/admin/code-products', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function listCodeProducts(): Promise<CodeProductListItem[]> {
  return adminFetch<CodeProductListItem[]>('/admin/code-products');
}

export async function disableCodeProduct(chainId: number, seller: string, sku: string): Promise<{ ok: true }> {
  const path = `/admin/code-products/${chainId}/${encodeURIComponent(seller)}/${encodeURIComponent(sku)}`;
  return adminFetch<{ ok: true }>(path, { method: 'DELETE' });
}
