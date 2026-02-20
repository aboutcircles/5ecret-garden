export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

export interface HttpTransport {
  request<T = unknown>(opts: HttpRequestOptions): Promise<T>;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`HTTP ${status} ${statusText}: ${body}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export class FetchHttpTransport implements HttpTransport {
  async request<T = unknown>(opts: HttpRequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json, application/ld+json',
      ...opts.headers,
    };

    let body: BodyInit | undefined = undefined;
    if (opts.body !== undefined) {
      if (typeof opts.body === 'string' || (typeof Blob !== 'undefined' && opts.body instanceof Blob)) {
        body = opts.body as any;
      } else if (headers['Content-Type']?.includes('application/x-www-form-urlencoded')) {
        body = opts.body as any;
      } else {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = JSON.stringify(opts.body);
      }
    }

    const res = await fetch(opts.url, {
      method: opts.method,
      headers,
      body,
      signal: opts.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HttpError(res.status, res.statusText, text);
    }

    const contentType = res.headers.get('content-type') || '';
    // Treat JSON-LD as JSON as well
    if (contentType.toLowerCase().includes('json')) {
      return (await res.json()) as T;
    }

    // For non-JSON responses, return text
    return (await res.text()) as unknown as T;
  }
}
