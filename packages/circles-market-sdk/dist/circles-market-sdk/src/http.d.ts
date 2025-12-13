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
export declare class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body: string;
    constructor(status: number, statusText: string, body: string);
}
export declare class FetchHttpTransport implements HttpTransport {
    request<T = unknown>(opts: HttpRequestOptions): Promise<T>;
}
//# sourceMappingURL=http.d.ts.map