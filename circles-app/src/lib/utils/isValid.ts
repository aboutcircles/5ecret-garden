//TODO: after migrate to daisyui 5, we can use directly into validators field

export function isValidName(name: string): boolean {
  // Check length (max 32 bytes, and at least 1 character)
  if (Buffer.byteLength(name, 'utf8') > 32) {
    return false;
  }

  const validChars = /^[0-9A-Za-z \-\_\.\(\)\'\&\+\#]+$/;
  return validChars.test(name);
}

export function isValidSymbol(symbol: string): boolean {
  // Check length (max 16 bytes, and at least 1 character)
  if (Buffer.byteLength(symbol, 'utf8') > 16) {
    return false;
  }

  const validChars = /^[0-9A-Za-z\-_]+$/;
  return validChars.test(symbol);
}

export function sanitizeText(input: string): string {
  return input
    .replace(/\\/g, '')         // Remove backslashes
    .replace(/'/g, '’')         // Replace single quotes with curly version
    .replace(/"/g, '”');        // Replace double quotes with curly version
}
