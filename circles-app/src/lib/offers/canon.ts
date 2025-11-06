import { CanonicalisationError, ObjectTooLargeError } from './errors';

const SIZE_LIMIT = 8 * 1024 * 1024; // 8 MiB

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function isInt64(n: number): boolean {
  // JS cannot exactly represent 64-bit ints beyond 2^53-1.
  // Treat “canonical integer” as a JS safe integer (stricter than int64 on purpose).
  return Number.isSafeInteger(n);
}

function isSafeDouble(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;
}

function sortKeys(obj: Record<string, Json>): [string, Json][] {
  const keys = Object.keys(obj);
  const set = new Set(keys);
  if (set.size !== keys.length) throw new CanonicalisationError('duplicate keys');
  keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return keys.map((k) => [k, obj[k]]);
}

function writeJson(val: Json, out: string[], depth: number): void {
  switch (typeof val) {
    case 'string':
      out.push(JSON.stringify(val));
      return;
    case 'number': {
      if (Number.isNaN(val) || !Number.isFinite(val)) throw new CanonicalisationError('invalid number');
      if (isInt64(val)) {
        out.push(String(Math.trunc(val)));
        return;
      }
      if (!isSafeDouble(val)) throw new CanonicalisationError('unsafe double');
      // Shortest round-trip double using JSON.stringify
      const s = JSON.stringify(val);
      if (s == null) throw new CanonicalisationError('number stringify');
      out.push(s);
      return;
    }
    case 'boolean':
      out.push(val ? 'true' : 'false');
      return;
    case 'object':
      if (val === null) {
        out.push('null');
        return;
      }
      if (Array.isArray(val)) {
        out.push('[');
        for (let i = 0; i < val.length; i++) {
          if (i) out.push(',');
          writeJson(val[i] as Json, out, depth + 1);
        }
        out.push(']');
        return;
      }
      // object
      out.push('{');
      let first = true;
      for (const [k, v] of sortKeys(val as Record<string, Json>)) {
        if (depth === 0 && k === 'signature') continue; // skip only at top level
        if (!first) out.push(',');
        first = false;
        out.push(JSON.stringify(k));
        out.push(':');
        writeJson(v as Json, out, depth + 1);
      }
      out.push('}');
      return;
    default:
      throw new CanonicalisationError('unsupported type');
  }
}

export function canonicaliseLink(linkObj: Record<string, Json>): Uint8Array {
  const out: string[] = [];
  writeJson(linkObj as Json, out, 0);
  const json = out.join('');
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > SIZE_LIMIT) throw new ObjectTooLargeError(bytes.length, SIZE_LIMIT);
  return bytes;
}
