export class HttpError extends Error {
    constructor(status, statusText, body) {
        super(`HTTP ${status} ${statusText}: ${body}`);
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export class FetchHttpTransport {
    async request(opts) {
        const headers = {
            Accept: 'application/json, application/ld+json',
            ...opts.headers,
        };
        let body = undefined;
        if (opts.body !== undefined) {
            if (typeof opts.body === 'string' || (typeof Blob !== 'undefined' && opts.body instanceof Blob)) {
                body = opts.body;
            }
            else if (headers['Content-Type']?.includes('application/x-www-form-urlencoded')) {
                body = opts.body;
            }
            else {
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
            return (await res.json());
        }
        // For non-JSON responses, return text
        return (await res.text());
    }
}
