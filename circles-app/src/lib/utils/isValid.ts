/**
 * Determines whether a name string is valid based on length and allowed characters.
 *
 * A valid name must be at most 19 bytes in UTF-8 encoding and contain only alphanumeric characters, spaces, and the following special characters: `- _ . ( ) ' & + #`.
 *
 * @param name - The name string to validate.
 * @returns `true` if the name meets both length and character requirements; otherwise, `false`.
 */

export function isValidName(name: string): boolean {
  // Check length (max 32 bytes, and at least 1 character)
  if (Buffer.byteLength(name, 'utf8') > 19) {
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

/**
 * Sanitizes a string by converting escaped whitespace sequences to their actual characters, removing backslashes, and replacing straight quotes with typographic quotes.
 *
 * Replaces escaped newline (`\n`), carriage return (`\r`), and tab (`\t`) sequences with their corresponding characters. All remaining backslashes are removed. Straight single and double quotes are replaced with typographic apostrophes and double quotes, respectively.
 *
 * @param input - The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\/g, '')
    .replace(/'/g, '’')
    .replace(/"/g, '”');
}
