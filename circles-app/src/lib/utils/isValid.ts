//TODO: after migrate to daisyui 5, we can use directly into validators field

const utf8Len = (s: string) => new TextEncoder().encode(s).length;

export function isValidName(name: string): boolean {
  // Check length (max 19 UTF-8 bytes)
  const maxBytes = 19;
  if (utf8Len(name) > maxBytes) {
    return false;
  }

  const validChars = /^[0-9A-Za-z \-\_\.\(\)\'\&\+\#]+$/;
  return validChars.test(name);
}

export function isValidSymbol(symbol: string): boolean {
  // Check length (max 16 UTF-8 bytes)
  const maxBytes = 16;
  if (utf8Len(symbol) > maxBytes) {
    return false;
  }

  const validChars = /^[0-9A-Za-z\-_]+$/;
  return validChars.test(symbol);
}

export function sanitizeText(input: string): string {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\/g, '')
    .replace(/'/g, '’')
    .replace(/"/g, '”');
}
