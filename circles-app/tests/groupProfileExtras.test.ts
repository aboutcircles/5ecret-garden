import { describe, expect, it } from 'vitest';
import {
  applyGroupProfileExtras,
  emptyForm,
  extractLegacyExternalLink,
  formFromProfile,
  injectLegacyExternalLink,
  isFormEmpty,
  isUrlWithHost,
  isValidEmail,
  parseAdditionalCriteria,
  readGroupProfileFields,
  validateGroupExtras,
  type GroupExtrasForm,
} from '$lib/areas/groups/model/groupProfileExtras';

describe('groupProfileExtras: isUrlWithHost', () => {
  it('accepts http(s) URLs with a dotted host', () => {
    expect(isUrlWithHost('https://example.org')).toBe(true);
    expect(isUrlWithHost('http://sub.example.org/path?q=1')).toBe(true);
  });

  it('normalises bare domains via sanitizeUrl', () => {
    expect(isUrlWithHost('example.com')).toBe(true);
    expect(isUrlWithHost('  example.com  ')).toBe(true);
  });

  it('rejects strings without a dotted host', () => {
    expect(isUrlWithHost('foo')).toBe(false);
    expect(isUrlWithHost('localhost')).toBe(false);
    expect(isUrlWithHost('')).toBe(false);
  });

  it('rejects non-http schemes', () => {
    expect(isUrlWithHost('javascript:alert(1)')).toBe(false);
    expect(isUrlWithHost('ftp://example.org')).toBe(false);
  });
});

describe('groupProfileExtras: isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('user@example.org')).toBe(true);
    expect(isValidEmail('  user.name+tag@sub.example.org  ')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('user@.org')).toBe(false);
    expect(isValidEmail('userexample.org')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('groupProfileExtras: parseAdditionalCriteria', () => {
  it('splits, trims and drops empty lines', () => {
    expect(parseAdditionalCriteria('a\n  b  \n\nc\n')).toEqual(['a', 'b', 'c']);
  });
  it('returns empty array for blank input', () => {
    expect(parseAdditionalCriteria('')).toEqual([]);
    expect(parseAdditionalCriteria('   \n  \n')).toEqual([]);
  });
});

describe('groupProfileExtras: legacy External link round-trip', () => {
  it('extracts trailing "External link: [label](url)" line', () => {
    const desc = 'A group.\n\nMore text.\nExternal link: [Manifesto](https://x.org/m)';
    expect(extractLegacyExternalLink(desc)).toEqual({ label: 'Manifesto', url: 'https://x.org/m' });
  });

  it('returns null when no legacy line is present', () => {
    expect(extractLegacyExternalLink('Just a description.')).toBeNull();
  });

  it('only matches the trailing position (ignores mid-body occurrences)', () => {
    const desc = 'External link: [Foo](https://foo.org) is at the start.\n\nRest of body.';
    expect(extractLegacyExternalLink(desc)).toBeNull();
  });

  it('re-injects the legacy line on save', () => {
    const out = injectLegacyExternalLink('A description.', 'Site', 'https://x.org');
    expect(out).toBe('A description.\nExternal link: [Site](https://x.org)');
  });

  it('replaces any pre-existing trailing legacy line', () => {
    const out = injectLegacyExternalLink(
      'A description.\nExternal link: [Old](https://old.org)',
      'New',
      'https://new.org',
    );
    expect(out).toBe('A description.\nExternal link: [New](https://new.org)');
  });

  it('strips the legacy line when both label and url are empty', () => {
    const out = injectLegacyExternalLink('Body.\nExternal link: [L](https://x.org)', '', '');
    expect(out).toBe('Body.');
  });

  it('handles empty description', () => {
    expect(injectLegacyExternalLink('', 'L', 'https://x.org')).toBe('External link: [L](https://x.org)');
  });
});

describe('groupProfileExtras: readGroupProfileFields', () => {
  it('reads nested SDK shape (externalLinks.website, membershipCriteria.*, contactInfo.*)', () => {
    const p = {
      description: 'hi',
      externalLinks: { website: 'https://example.org' },
      groupType: 'open',
      membershipCriteria: {
        membershipFee: 2.5,
        minRepScore: 10,
        additionalCriteria: ['must be active', 'must be trusted'],
      },
      contactInfo: { email: 'hi@example.org', website: 'https://contact.example.org' },
    };
    expect(readGroupProfileFields(p)).toEqual({
      website: 'https://example.org',
      linkLabel: undefined,
      linkUrl: undefined,
      groupType: 'open',
      membershipFee: 2.5,
      minRepScore: 10,
      additionalCriteria: ['must be active', 'must be trusted'],
      contactEmail: 'hi@example.org',
      contactWebsite: 'https://contact.example.org',
    });
  });

  it('reads flat HTTP-endpoint shape and prefers it when both flat and nested exist', () => {
    const p = {
      externalWebsite: 'https://flat.example.org',
      externalLinks: { website: 'https://nested.example.org' },
      membershipFee: 1,
      membershipCriteria: { membershipFee: 99 },
    };
    const n = readGroupProfileFields(p);
    expect(n.website).toBe('https://flat.example.org');
    expect(n.membershipFee).toBe(1);
  });

  it('extracts the legacy External link from description', () => {
    const p = { description: 'About us.\nExternal link: [Site](https://x.org)' };
    const n = readGroupProfileFields(p);
    expect(n.linkLabel).toBe('Site');
    expect(n.linkUrl).toBe('https://x.org');
  });

  it('returns undefined fields for an empty profile', () => {
    const n = readGroupProfileFields({});
    expect(n).toEqual({
      website: undefined,
      linkLabel: undefined,
      linkUrl: undefined,
      groupType: undefined,
      membershipFee: undefined,
      minRepScore: undefined,
      additionalCriteria: undefined,
      contactEmail: undefined,
      contactWebsite: undefined,
    });
  });

  it('drops empty additionalCriteria arrays', () => {
    expect(readGroupProfileFields({ membershipCriteria: { additionalCriteria: [] } }).additionalCriteria).toBeUndefined();
  });
});

describe('groupProfileExtras: formFromProfile', () => {
  it('hydrates a complete form from a nested profile', () => {
    const f = formFromProfile({
      externalLinks: { website: 'https://example.org' },
      groupType: 'closed',
      membershipCriteria: { membershipFee: 2.5, minRepScore: 5, additionalCriteria: ['x', 'y'] },
      contactInfo: { email: 'a@b.org', website: 'https://c.org' },
    });
    expect(f).toEqual({
      website: 'https://example.org',
      linkLabel: '',
      linkUrl: '',
      groupType: 'closed',
      membershipFee: '2.5',
      minRepScore: '5',
      additionalCriteria: 'x\ny',
      contactEmail: 'a@b.org',
      contactWebsite: 'https://c.org',
    });
  });

  it('returns an empty form for an empty profile', () => {
    expect(formFromProfile({})).toEqual(emptyForm());
  });
});

describe('groupProfileExtras: validateGroupExtras', () => {
  const base = emptyForm();

  it('passes an empty form', () => {
    const { ok, errors } = validateGroupExtras(base);
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });

  it('flags an invalid website', () => {
    const { ok, errors } = validateGroupExtras({ ...base, website: 'foo' });
    expect(ok).toBe(false);
    expect(errors.website).toBeDefined();
  });

  it('flags custom link with only a label', () => {
    const { ok, errors } = validateGroupExtras({ ...base, linkLabel: 'Hi' });
    expect(ok).toBe(false);
    expect(errors.linkUrl).toBeDefined();
  });

  it('flags custom link with only a URL', () => {
    const { ok, errors } = validateGroupExtras({ ...base, linkUrl: 'https://x.org' });
    expect(ok).toBe(false);
    expect(errors.linkLabel).toBeDefined();
  });

  it('flags label longer than MAX_LINK_LABEL_LENGTH', () => {
    const { errors } = validateGroupExtras({ ...base, linkLabel: 'a'.repeat(60), linkUrl: 'https://x.org' });
    expect(errors.linkLabel).toMatch(/Max/);
  });

  it('accepts a well-formed custom link pair', () => {
    const { ok } = validateGroupExtras({ ...base, linkLabel: 'Site', linkUrl: 'https://x.org' });
    expect(ok).toBe(true);
  });

  it('rejects membership fee out of range', () => {
    expect(validateGroupExtras({ ...base, membershipFee: '200' }).errors.membershipFee).toBeDefined();
    expect(validateGroupExtras({ ...base, membershipFee: '-1' }).errors.membershipFee).toBeDefined();
  });

  it('rejects membership fee with > 2 decimals', () => {
    expect(validateGroupExtras({ ...base, membershipFee: '2.005' }).errors.membershipFee).toBeDefined();
  });

  it('accepts membership fee 0..100 with up to 2 decimals', () => {
    expect(validateGroupExtras({ ...base, membershipFee: '0' }).ok).toBe(true);
    expect(validateGroupExtras({ ...base, membershipFee: '99.99' }).ok).toBe(true);
    expect(validateGroupExtras({ ...base, membershipFee: '15' }).ok).toBe(true);
  });

  it('rejects negative min rep score', () => {
    expect(validateGroupExtras({ ...base, minRepScore: '-5' }).errors.minRepScore).toBeDefined();
  });

  it('rejects too many additional criteria lines', () => {
    const lines = Array.from({ length: 21 }, (_, i) => `c${i}`).join('\n');
    expect(validateGroupExtras({ ...base, additionalCriteria: lines }).errors.additionalCriteria).toBeDefined();
  });

  it('rejects an over-long single criterion', () => {
    const tooLong = 'x'.repeat(300);
    expect(validateGroupExtras({ ...base, additionalCriteria: tooLong }).errors.additionalCriteria).toBeDefined();
  });

  it('rejects malformed contact email', () => {
    expect(validateGroupExtras({ ...base, contactEmail: 'nope' }).errors.contactEmail).toBeDefined();
  });

  it('rejects bad contact website', () => {
    expect(validateGroupExtras({ ...base, contactWebsite: 'foo' }).errors.contactWebsite).toBeDefined();
  });

  it('rejects a website URL longer than 2000 chars (service strip-and-continue guard)', () => {
    const longUrl = 'https://example.org/' + 'a'.repeat(2001);
    expect(validateGroupExtras({ ...base, website: longUrl }).errors.website).toBeDefined();
  });

  it('rejects a contact email longer than 256 chars (service VARCHAR(256) guard)', () => {
    const longEmail = 'a'.repeat(250) + '@example.org';
    expect(validateGroupExtras({ ...base, contactEmail: longEmail }).errors.contactEmail).toBeDefined();
  });
});

describe('groupProfileExtras: applyGroupProfileExtras (mutate + delete)', () => {
  function fullForm(): GroupExtrasForm {
    return {
      website: 'https://example.org',
      linkLabel: 'Site',
      linkUrl: 'https://x.org',
      groupType: 'open',
      membershipFee: '2.5',
      minRepScore: '5',
      additionalCriteria: 'must be active\nmust be trusted',
      contactEmail: 'a@b.org',
      contactWebsite: 'https://c.org',
    };
  }

  it('writes nested groups onto an empty profile', () => {
    const p: any = { description: 'About.' };
    applyGroupProfileExtras(p, fullForm());
    // sanitizeUrl normalises bare/short URLs by parsing them through URL, which adds the trailing slash.
    expect(p.externalLinks).toEqual({ website: 'https://example.org/' });
    expect(p.groupType).toBe('open');
    expect(p.membershipCriteria).toEqual({
      minRepScore: 5,
      membershipFee: 2.5,
      additionalCriteria: ['must be active', 'must be trusted'],
    });
    expect(p.contactInfo).toEqual({ email: 'a@b.org', website: 'https://c.org/' });
    expect(p.description).toBe('About.\nExternal link: [Site](https://x.org)');
  });

  it('deletes nested groups when their fields are all cleared', () => {
    const p: any = {
      externalLinks: { website: 'https://old.example.org' },
      groupType: 'closed',
      membershipCriteria: { membershipFee: 9 },
      contactInfo: { email: 'old@x.org' },
      description: 'About.',
    };
    applyGroupProfileExtras(p, emptyForm());
    expect(p.externalLinks).toBeUndefined();
    expect(p.groupType).toBeUndefined();
    expect(p.membershipCriteria).toBeUndefined();
    expect(p.contactInfo).toBeUndefined();
    expect(p.description).toBe('About.');
  });

  it('strips legacy External link from description when link fields are cleared', () => {
    const p: any = { description: 'About.\nExternal link: [Old](https://old.org)' };
    applyGroupProfileExtras(p, emptyForm());
    expect(p.description).toBe('About.');
  });

  it('also removes any flat-shape sibling keys to avoid double-writes', () => {
    const p: any = {
      externalWebsite: 'https://flat.org',
      membershipFee: 9,
      minRepScore: 1,
      additionalCriteria: ['x'],
      contactEmail: 'flat@x.org',
      contactWebsite: 'https://flat-contact.org',
      description: '',
    };
    applyGroupProfileExtras(p, emptyForm());
    expect('externalWebsite' in p).toBe(false);
    expect('membershipFee' in p).toBe(false);
    expect('minRepScore' in p).toBe(false);
    expect('additionalCriteria' in p).toBe(false);
    expect('contactEmail' in p).toBe(false);
    expect('contactWebsite' in p).toBe(false);
  });

  it('preserves unrelated profile fields (name/location/extensions)', () => {
    const p: any = {
      name: 'My Group',
      location: 'Berlin',
      extensions: [{ foo: 'bar' }],
      description: 'About.',
    };
    applyGroupProfileExtras(p, fullForm());
    expect(p.name).toBe('My Group');
    expect(p.location).toBe('Berlin');
    expect(p.extensions).toEqual([{ foo: 'bar' }]);
  });

  it('round-trips an unknown groupType value intact', () => {
    const p: any = {};
    applyGroupProfileExtras(p, { ...emptyForm(), groupType: 'invite-only-experimental' });
    expect(p.groupType).toBe('invite-only-experimental');
  });

  it('round-trips full → read → form → apply preserves shape', () => {
    const original: any = { description: 'About.' };
    applyGroupProfileExtras(original, fullForm());
    const hydrated = formFromProfile(original);
    const fresh: any = { description: original.description };
    applyGroupProfileExtras(fresh, hydrated);
    expect(fresh.externalLinks).toEqual(original.externalLinks);
    expect(fresh.groupType).toBe(original.groupType);
    expect(fresh.membershipCriteria).toEqual(original.membershipCriteria);
    expect(fresh.contactInfo).toEqual(original.contactInfo);
    expect(fresh.description).toBe(original.description);
  });
});

describe('groupProfileExtras: isFormEmpty', () => {
  it('returns true for emptyForm()', () => {
    expect(isFormEmpty(emptyForm())).toBe(true);
  });
  it('returns false when any field is set', () => {
    expect(isFormEmpty({ ...emptyForm(), website: 'https://x.org' })).toBe(false);
    expect(isFormEmpty({ ...emptyForm(), groupType: 'open' })).toBe(false);
    expect(isFormEmpty({ ...emptyForm(), additionalCriteria: 'a' })).toBe(false);
  });
});
