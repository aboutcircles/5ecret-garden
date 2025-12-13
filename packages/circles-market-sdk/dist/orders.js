import { HttpError } from './http';
export class OrdersClientImpl {
    constructor(marketApiBase, http, authContext) {
        this.marketApiBase = marketApiBase;
        this.http = http;
        this.authContext = authContext;
    }
    async list(opts) {
        const token = this.requireToken();
        const params = new URLSearchParams();
        if (opts?.page !== undefined)
            params.set('page', String(opts.page));
        if (opts?.pageSize !== undefined)
            params.set('pageSize', String(opts.pageSize));
        const res = await this.http.request({
            method: 'GET',
            url: `${this.marketApiBase}/api/cart/v1/orders/by-buyer?${params.toString()}`,
            headers: { Authorization: `Bearer ${token}` },
        });
        return Array.isArray(res.items) ? res.items : [];
    }
    async getById(orderId) {
        const token = this.requireToken();
        try {
            return await this.http.request({
                method: 'GET',
                url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}`,
                headers: { Authorization: `Bearer ${token}` },
            });
        }
        catch (e) {
            if (e instanceof HttpError && e.status === 404) {
                return null;
            }
            throw e;
        }
    }
    async getStatusHistory(orderId) {
        const token = this.requireToken();
        return await this.http.request({
            method: 'GET',
            url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}/status-history`,
            headers: { Authorization: `Bearer ${token}` },
        });
    }
    subscribeStatusEvents(onEvent) {
        const token = this.requireToken();
        const controller = new AbortController();
        const url = `${this.marketApiBase}/api/cart/v1/orders/events`;
        // Use native fetch for SSE
        fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/event-stream',
            },
            signal: controller.signal,
        })
            .then(async (res) => {
            if (!res.ok || !res.body)
                throw new Error(`SSE failed: ${res.status}`);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            // Basic SSE parser: split by double newlines
            while (true) {
                if (controller.signal.aborted)
                    break;
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf('\n\n')) >= 0) {
                    const chunk = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);
                    const evt = parseSseEvent(chunk);
                    if (evt && (evt.event === 'order-status' || evt.event === undefined)) {
                        try {
                            const data = JSON.parse(evt.data || '{}');
                            onEvent(data);
                        }
                        catch {
                            // ignore malformed JSON
                        }
                    }
                }
            }
        })
            .catch(() => {
            // swallow errors; consumers can resubscribe
        });
        return () => controller.abort();
    }
    onOrderDelivered(handler) {
        const ORDER_DELIVERED = 'https://schema.org/OrderDelivered';
        const PAYMENT_COMPLETE = 'https://schema.org/PaymentComplete';
        return this.subscribeStatusEvents(async (evt) => {
            const interesting = evt.newStatus === ORDER_DELIVERED || evt.newStatus === PAYMENT_COMPLETE;
            if (!interesting)
                return;
            const snap = await this.getById(evt.orderId);
            if (snap)
                handler(snap);
        });
    }
    requireToken() {
        const token = this.authContext.getToken();
        if (!token)
            throw new Error('Not authenticated');
        return token;
    }
}
function parseSseEvent(chunk) {
    const lines = chunk.split(/\r?\n/);
    let event;
    const dataParts = [];
    for (const line of lines) {
        if (line.startsWith('event:'))
            event = line.slice(6).trim();
        else if (line.startsWith('data:'))
            dataParts.push(line.slice(5).trim());
    }
    if (dataParts.length === 0 && !event)
        return null;
    return { event, data: dataParts.join('\n') };
}
