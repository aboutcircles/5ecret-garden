import { sanitizeUrl } from '$lib/shared/ui/content/markdown/ast';

export const MAX_LINK_LABEL_LENGTH = 48;
export const MAX_ADDITIONAL_CRITERIA = 20;
export const MAX_CRITERION_LENGTH = 256;
export const MAX_URL_LENGTH = 2000;
export const MAX_EMAIL_LENGTH = 256;

export interface GroupExtrasForm {
  website: string;
  linkLabel: string;
  linkUrl: string;
  groupType: string;
  membershipFee: string;
  minRepScore: string;
  additionalCriteria: string;
  contactEmail: string;
  contactWebsite: string;
}

export interface NormalisedGroupExtras {
  website?: string;
  linkLabel?: string;
  linkUrl?: string;
  groupType?: string;
  membershipFee?: number;
  minRepScore?: number;
  additionalCriteria?: string[];
  contactEmail?: string;
  contactWebsite?: string;
}

export function emptyForm(): GroupExtrasForm {
  return {
    website: '',
    linkLabel: '',
    linkUrl: '',
    groupType: '',
    membershipFee: '',
    minRepScore: '',
    additionalCriteria: '',
    contactEmail: '',
    contactWebsite: '',
  };
}

export function isUrlWithHost(value: string): boolean {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  if (raw.length > MAX_URL_LENGTH) return false;
  const sanitized = sanitizeUrl(raw);
  if (!sanitized) return false;
  if (sanitized.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(sanitized);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  const trimmed = String(value ?? '').trim();
  if (trimmed.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function parseAdditionalCriteria(text: string): string[] {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function groupAccessLabel(gt: string | undefined): string {
  if (gt === 'open') return 'Open';
  if (gt === 'closed') return 'Closed';
  if (gt) return `Other (${gt})`;
  return '';
}

const LEGACY_LINK_RE = /\n?External link:\s*\[([^\]]*)\]\((.*?)\)\s*$/;

export function extractLegacyExternalLink(description: string): { label: string; url: string } | null {
  const m = String(description ?? '').match(LEGACY_LINK_RE);
  if (!m) return null;
  return { label: m[1], url: m[2] };
}

export function injectLegacyExternalLink(description: string, label: string, url: string): string {
  const stripped = String(description ?? '').replace(LEGACY_LINK_RE, '').trimEnd();
  const cleanLabel = String(label ?? '').trim();
  const cleanUrl = String(url ?? '').trim();
  if (!cleanLabel || !cleanUrl) return stripped;
  const sep = stripped.length > 0 ? '\n' : '';
  return `${stripped}${sep}External link: [${cleanLabel}](${cleanUrl})`;
}

export function readGroupProfileFields(p: any): NormalisedGroupExtras {
  const pick = <T>(...xs: Array<T | undefined | null | ''>): T | undefined =>
    xs.find((x) => x !== undefined && x !== null && x !== '') as T | undefined;

  const criteria = p?.additionalCriteria ?? p?.membershipCriteria?.additionalCriteria;
  const legacy = extractLegacyExternalLink(p?.description ?? '');

  return {
    website: pick<string>(p?.externalWebsite, p?.externalLinks?.website),
    linkLabel: legacy?.label,
    linkUrl: legacy?.url,
    groupType: pick<string>(p?.groupType),
    membershipFee: pick<number>(p?.membershipFee, p?.membershipCriteria?.membershipFee),
    minRepScore: pick<number>(p?.minRepScore, p?.membershipCriteria?.minRepScore),
    additionalCriteria: Array.isArray(criteria) && criteria.length ? criteria.map(String) : undefined,
    contactEmail: pick<string>(p?.contactEmail, p?.contactInfo?.email),
    contactWebsite: pick<string>(p?.contactWebsite, p?.contactInfo?.website),
  };
}

export function formFromProfile(p: any): GroupExtrasForm {
  const n = readGroupProfileFields(p);
  return {
    website: n.website ?? '',
    linkLabel: n.linkLabel ?? '',
    linkUrl: n.linkUrl ?? '',
    groupType: n.groupType ?? '',
    membershipFee: n.membershipFee !== undefined ? String(n.membershipFee) : '',
    minRepScore: n.minRepScore !== undefined ? String(n.minRepScore) : '',
    additionalCriteria: (n.additionalCriteria ?? []).join('\n'),
    contactEmail: n.contactEmail ?? '',
    contactWebsite: n.contactWebsite ?? '',
  };
}

export function validateGroupExtras(form: GroupExtrasForm): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (form.website && !isUrlWithHost(form.website))
    errors.website = 'Enter a URL like https://example.org.';

  const labelTrim = form.linkLabel.trim();
  const urlTrim = form.linkUrl.trim();
  const hasLabel = labelTrim.length > 0;
  const hasUrl = urlTrim.length > 0;
  if (hasLabel && labelTrim.length > MAX_LINK_LABEL_LENGTH)
    errors.linkLabel = `Max ${MAX_LINK_LABEL_LENGTH} characters.`;
  if (hasLabel && !hasUrl) errors.linkUrl = 'Add the URL too, or clear the label.';
  if (hasUrl && !isUrlWithHost(form.linkUrl)) errors.linkUrl = 'Enter a URL like https://example.org.';
  if (hasUrl && !hasLabel) errors.linkLabel = 'Add a label, or clear the URL.';

  if (form.membershipFee !== '') {
    const trimmed = form.membershipFee.trim();
    const n = Number(trimmed);
    if (!isFinite(n) || n < 0 || n > 100) errors.membershipFee = 'Must be a number 0–100.';
    else if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) errors.membershipFee = 'Up to 2 decimals.';
  }

  if (form.minRepScore !== '') {
    const n = Number(form.minRepScore);
    if (!isFinite(n) || n < 0) errors.minRepScore = '0 or greater.';
  }

  const lines = parseAdditionalCriteria(form.additionalCriteria);
  if (lines.length > MAX_ADDITIONAL_CRITERIA) {
    errors.additionalCriteria = `Max ${MAX_ADDITIONAL_CRITERIA} criteria (one per line).`;
  } else {
    const tooLong = lines.find((l) => l.length > MAX_CRITERION_LENGTH);
    if (tooLong) errors.additionalCriteria = `Each criterion must be ${MAX_CRITERION_LENGTH} characters or fewer.`;
    const hasEmbeddedNewline = lines.some((l) => /\n/.test(l));
    if (hasEmbeddedNewline) errors.additionalCriteria = 'Criteria must not contain embedded line breaks.';
  }

  if (form.contactEmail && !isValidEmail(form.contactEmail))
    errors.contactEmail = 'Enter a valid email address.';

  if (form.contactWebsite && !isUrlWithHost(form.contactWebsite))
    errors.contactWebsite = 'Enter a URL like https://example.org.';

  return { ok: Object.keys(errors).length === 0, errors };
}

export function applyGroupProfileExtras(p: any, form: GroupExtrasForm): void {
  const website = form.website ? sanitizeUrl(form.website) : null;
  if (website) p.externalLinks = { website };
  else delete p.externalLinks;
  delete p.externalWebsite;

  const mc: Record<string, unknown> = {};
  if (form.minRepScore !== '') mc.minRepScore = Number(form.minRepScore);
  if (form.membershipFee !== '') mc.membershipFee = Number(form.membershipFee);
  const crit = parseAdditionalCriteria(form.additionalCriteria);
  if (crit.length) mc.additionalCriteria = crit;
  if (Object.keys(mc).length) p.membershipCriteria = mc;
  else delete p.membershipCriteria;
  delete p.minRepScore;
  delete p.membershipFee;
  delete p.additionalCriteria;

  if (form.groupType) p.groupType = form.groupType;
  else delete p.groupType;

  const ci: Record<string, unknown> = {};
  const email = form.contactEmail.trim();
  if (email) ci.email = email;
  const cw = form.contactWebsite ? sanitizeUrl(form.contactWebsite) : null;
  if (cw) ci.website = cw;
  if (Object.keys(ci).length) p.contactInfo = ci;
  else delete p.contactInfo;
  delete p.contactEmail;
  delete p.contactWebsite;

  p.description = injectLegacyExternalLink(p.description ?? '', form.linkLabel, form.linkUrl);
}

export function isFormEmpty(form: GroupExtrasForm): boolean {
  return (
    !form.website &&
    !form.linkLabel &&
    !form.linkUrl &&
    !form.groupType &&
    !form.membershipFee &&
    !form.minRepScore &&
    !form.additionalCriteria &&
    !form.contactEmail &&
    !form.contactWebsite
  );
}
