// Shared JSON utilities for robust serialization
export function safeStringify(value: any, space: number = 2): string {
  const seen = new WeakSet();
  function replacer(_key: string, val: any) {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    if (val instanceof Map) {
      return Object.fromEntries(val);
    }
    if (val instanceof Set) {
      return Array.from(val);
    }
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  }
  try {
    return JSON.stringify(value, replacer, space);
  } catch (e) {
    console.error('Error serializing data:', e);
    return '{}';
  }
}
