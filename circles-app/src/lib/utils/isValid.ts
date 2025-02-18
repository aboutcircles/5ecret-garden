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
  