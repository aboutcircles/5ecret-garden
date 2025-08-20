// src/lib/utils/ipfs.ts

/**
 * Fetches data from IPFS using the gateway endpoint with timeout support
 * @param cid - The IPFS Content Identifier
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Promise that resolves to the parsed JSON data or null on error
 */
export async function fetchFromIpfs(cid: string, timeoutMs: number = 5000): Promise<any> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`http://127.0.0.1:8080/ipfs/${cid}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CID ${cid}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`IPFS fetch timeout for CID ${cid} after ${timeoutMs}ms`);
    } else {
      console.warn(`Failed to fetch from IPFS: ${cid}`, error);
    }
    return null;
  }
}

/**
 * Uploads data to IPFS using the API endpoint
 * @param data - The data to upload (object will be JSON stringified)
 * @param filename - Optional filename for the upload
 * @returns Promise that resolves to the CID hash
 */
export async function uploadToIpfs(data: any, filename: string = 'data.json'): Promise<string> {
  const buffer = new TextEncoder().encode(JSON.stringify(data));
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);
  
  const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Failed to upload to IPFS: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.Hash;
}