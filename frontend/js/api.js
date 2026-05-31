/* AliStroy CRM API client */
window.API = (function () {
    const base = '/api';

    async function req(path, opts = {}) {
        const headers = opts.headers || {};
        const config = { method: opts.method || 'GET', headers };
        if (opts.body !== undefined && !(opts.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(opts.body);
        } else if (opts.body instanceof FormData) {
            config.body = opts.body;
        }
        const res = await fetch(base + path, config);
        if (!res.ok) {
            let err;
            try { err = await res.json(); } catch (e) { err = { error: res.statusText }; }
            throw new Error(err.error || 'Хатогӣ');
        }
        if (res.status === 204) return null;
        return res.json();
    }

    return {
        // Health
        health: () => req('/health'),

        // Categories
        categories: {
            list: (tree = false) => req('/categories' + (tree ? '?tree=1' : '')),
            create: (data) => req('/categories', { method: 'POST', body: data }),
            update: (id, data) => req('/categories/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/categories/' + id, { method: 'DELETE' }),
        },

        // Subcategories
        subcategories: {
            list: (catId) => req('/subcategories' + (catId ? '?category_id=' + catId : '')),
            create: (data) => req('/subcategories', { method: 'POST', body: data }),
            update: (id, data) => req('/subcategories/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/subcategories/' + id, { method: 'DELETE' }),
        },

        // Products
        products: {
            list: (params = {}) => {
                const qs = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
                });
                const s = qs.toString();
                return req('/products' + (s ? '?' + s : ''));
            },
            get: (id) => req('/products/' + id),
            create: (data) => req('/products', { method: 'POST', body: data }),
            update: (id, data) => req('/products/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/products/' + id, { method: 'DELETE' }),
            history: (id) => req('/products/' + id + '/price-history'),
        },

        // Suppliers
        suppliers: {
            list: (q = '') => req('/suppliers' + (q ? '?q=' + encodeURIComponent(q) : '')),
            get: (id) => req('/suppliers/' + id),
            create: (data) => req('/suppliers', { method: 'POST', body: data }),
            update: (id, data) => req('/suppliers/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/suppliers/' + id, { method: 'DELETE' }),
        },

        // Clients
        clients: {
            list: (q = '') => req('/clients' + (q ? '?q=' + encodeURIComponent(q) : '')),
            get: (id) => req('/clients/' + id),
            create: (data) => req('/clients', { method: 'POST', body: data }),
            update: (id, data) => req('/clients/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/clients/' + id, { method: 'DELETE' }),
        },

        // Orders
        orders: {
            list: (params = {}) => {
                const qs = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
                });
                const s = qs.toString();
                return req('/orders' + (s ? '?' + s : ''));
            },
            get: (id) => req('/orders/' + id),
            create: (data) => req('/orders', { method: 'POST', body: data }),
            update: (id, data) => req('/orders/' + id, { method: 'PUT', body: data }),
            remove: (id) => req('/orders/' + id, { method: 'DELETE' }),
        },

        // Dashboard / Mind map / Search
        dashboard: () => req('/dashboard/stats'),
        mindmap: () => req('/mindmap'),
        search: (q) => req('/search?q=' + encodeURIComponent(q)),

        // Upload
        upload: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            return req('/upload', { method: 'POST', body: fd });
        },
    };
})();
